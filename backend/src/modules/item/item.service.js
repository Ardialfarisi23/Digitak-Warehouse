const itemRepository = require("./item.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const notificationService = require("../../modules/notifications/notifications.service");
const { createAuditLog } = require("../../utils/audit-log");

const create = async (data, userId) => {
  const existing = await itemRepository.findByKode(data.kode_perangkat, { includeInactive: true });

  if (existing) {
    if (!existing.is_aktif) {
      throw new AppError(
        "Kode sudah dipakai oleh barang yang telah dihapus.",
        400
      );
    }
    throw new AppError("Kode item sudah digunakan.", 400);
  }

  const createData = {
    ...data,
    created_by: Number(userId),
    updated_by: Number(userId),
  };

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.barang.create({ data: createData });

    await createAuditLog(
      {
        entityType: "item",
        entityId: item.barang_id,
        aksi: "create",
        actorId: userId,
        dataSebelum: null,
        dataSesudah: item,
      },
      tx
    );

    return item;
  });

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(userId) },
    select: { nama: true },
  });

  try {
    const roles = ["admin_general", "supervisor", "staf_gudang"];
    for (const role of roles) {
      await notificationService.create({
        role,
        type: "info",
        title: "Barang Baru Ditambahkan",
        message: `Barang baru: ${result.nama_barang} (Kode: ${result.kode_perangkat}) telah ditambahkan oleh ${actor?.nama || "Staf"}.`,
        link: "/dashboard/master-data",
      });
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi item baru:", notifErr);
  }

  return result;
};

const findAll = async (query) => {
  return await itemRepository.findAll(query);
};

const findByKode = async (kode_perangkat) => {
  const record = await itemRepository.findByKode(kode_perangkat);

  if (!record) {
    throw new AppError("Data tidak ditemukan.", 404);
  }

  return record;
};

const update = async (kode_perangkat, data, userId) => {
  const record = await itemRepository.findByKode(kode_perangkat, { includeInactive: true });

  if (!record) {
    throw new AppError("Item tidak ditemukan.", 404);
  }

  if (data.kode_perangkat && data.kode_perangkat !== kode_perangkat) {
    const existing = await itemRepository.findByKode(data.kode_perangkat, { includeInactive: true });
    if (existing) {
      if (!existing.is_aktif) {
        throw new AppError(
          "Kode sudah dipakai oleh barang yang telah dihapus.",
          400
        );
      }
      throw new AppError("Kode item sudah digunakan.", 400);
    }
  }

  const updateData = {
    ...data,
    updated_by: Number(userId),
  };

  const result = await itemRepository.update(record.barang_id, updateData);

  try {
    const [admins, supervisors] = await Promise.all([
      prisma.user_account.findMany({
        where: { role: "admin_general", is_aktif: true },
        select: { user_id: true },
      }),
      prisma.user_account.findMany({
        where: { role: "supervisor", is_aktif: true },
        select: { user_id: true },
      }),
    ]);

    const userIds = [
      ...admins.map((a) => a.user_id).filter((id) => id != null),
      ...supervisors.map((s) => s.user_id).filter((id) => id != null),
    ];

    if (userIds.length > 0) {
      await notificationService.create({
        userId: userIds,
        type: "info",
        title: "Item Diperbarui",
        message: `Item ${result.kode_perangkat} - ${result.nama_barang || ""} telah diperbarui.`,
        link: "/dashboard/master-data",
      });
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi item update:", notifErr);
  }

  return result;
};

const softDelete = async (barang_id, userId) => {
  const result = await itemRepository.softDelete(barang_id, userId);

  if (!result) {
    throw new AppError("Item tidak ditemukan.", 404);
  }

  if (result.alreadyInactive) {
    throw new AppError("Barang sudah dinonaktifkan.", 400);
  }

  if (result.blocked) {
    throw new AppError(
      "Barang tidak dapat dinonaktifkan karena masih memiliki stok aktif di gudang.",
      400
    );
  }

  await createAuditLog(
    {
      entityType: "item",
      entityId: Number(barang_id),
      aksi: "soft_delete",
      actorId: userId,
      dataSebelum: null,
      dataSesudah: { barang_id: Number(barang_id), is_aktif: false },
    },
    prisma
  );

  return result;
};

const restore = async (kode_perangkat, userId) => {
  const record = await itemRepository.findByKode(kode_perangkat, {
    includeInactive: true,
  });

  if (!record) {
    throw new AppError("Item tidak ditemukan.", 404);
  }

  const result = await itemRepository.restore(record.barang_id, userId);

  if (!result) {
    throw new AppError("Item tidak ditemukan.", 404);
  }

  if (result.alreadyActive) {
    throw new AppError("Barang sudah aktif.", 400);
  }

  await createAuditLog(
    {
      entityType: "item",
      entityId: Number(record.barang_id),
      aksi: "restore",
      actorId: userId,
      dataSebelum: null,
      dataSesudah: { barang_id: Number(record.barang_id), is_aktif: true },
    },
    prisma
  );

  return result;
};

module.exports = {
  create,
  findAll,
  findByKode,
  update,
  softDelete,
  restore,
};
