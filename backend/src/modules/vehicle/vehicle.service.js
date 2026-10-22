const vehicleRepository = require("./vehicle.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const notificationService = require("../../modules/notifications/notifications.service");
const { createAuditLog } = require("../../utils/audit-log");

const create = async (data, userId) => {
  const existing = await vehicleRepository.findByNoPolisi(data.no_polisi, { includeInactive: true });

  if (existing) {
    if (!existing.is_aktif) {
      throw new AppError(
        "No polisi sudah dipakai oleh kendaraan yang telah dihapus.",
        400
      );
    }
    throw new AppError(`Nomor polisi ${existing.no_polisi} sudah digunakan oleh kendaraan ${[existing.merk, existing.jenis_kendaraan].filter(Boolean).join(" ") || "lain"}.`, 409);
  }

  const selectedGudangId = data.gudang_id || data.gudangId || data.warehouseId || null;

  const createData = {
    ...data,
    gudang_id: selectedGudangId,
    created_by: Number(userId),
    updated_by: Number(userId),
  };

  const result = await prisma.$transaction(async (tx) => {
    const vehicle = await tx.kendaraan.create({
      data: createData,
      include: { gudang: true },
    });

    await createAuditLog(
      {
        entityType: "vehicle",
        entityId: vehicle.kendaraan_id,
        aksi: "create",
        actorId: userId,
        dataSebelum: null,
        dataSesudah: vehicle,
      },
      tx
    );

    return vehicle;
  });

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(userId) },
    select: { nama: true },
  });

  try {
    const roles = ["admin_general", "supervisor"];
    for (const role of roles) {
      await notificationService.create({
        role,
        type: "info",
        title: "Kendaraan Baru Ditambahkan",
        message: `Kendaraan baru ditambahkan: ${result.jenis_kendaraan} (Plat: ${result.no_polisi}) oleh ${actor?.nama || "Staf"}.`,
        link: "/dashboard/master-data",
      });
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi kendaraan baru:", notifErr);
  }

  return result;
};

const findAll = async (query) => {
  return await vehicleRepository.findAll(query);
};

const findByNoPolisi = async (no_polisi) => {
  const record = await vehicleRepository.findByNoPolisi(no_polisi);

  if (!record) {
    throw new AppError("Data tidak ditemukan.", 404);
  }

  return record;
};

const update = async (no_polisi, data, userId) => {
  const record = await vehicleRepository.findByNoPolisi(no_polisi, { includeInactive: true });

  if (!record) {
    throw new AppError("Vehicle tidak ditemukan.", 404);
  }

  if (data.no_polisi && data.no_polisi !== no_polisi) {
    const existing = await vehicleRepository.findByNoPolisi(data.no_polisi, { includeInactive: true });
    if (existing && existing.kendaraan_id !== record.kendaraan_id) {
      if (!existing.is_aktif) {
        throw new AppError(
          "No polisi sudah dipakai oleh kendaraan yang telah dihapus.",
          400
        );
      }
      throw new AppError(`Nomor polisi ${existing.no_polisi} sudah digunakan oleh kendaraan ${[existing.merk, existing.jenis_kendaraan].filter(Boolean).join(" ") || "lain"}.`, 409);
    }
  }

  const selectedGudangId = data.gudang_id || data.gudangId || data.warehouseId || null;

  const updateData = {
    ...data,
    gudang_id: selectedGudangId,
    updated_by: Number(userId),
  };

  return await vehicleRepository.update(record.kendaraan_id, updateData);
};

const softDelete = async (kendaraan_id, userId) => {
  const result = await vehicleRepository.softDelete(kendaraan_id, userId);

  if (!result) {
    throw new AppError("Kendaraan tidak ditemukan.", 404);
  }

  if (result.alreadyInactive) {
    throw new AppError("Kendaraan sudah dinonaktifkan.", 400);
  }

  if (result.blocked) {
    throw new AppError(
      "Kendaraan tidak dapat dinonaktifkan karena masih memiliki Surat Jalan yang belum selesai.",
      400
    );
  }

  await createAuditLog(
    {
      entityType: "kendaraan",
      entityId: Number(kendaraan_id),
      aksi: "soft_delete",
      actorId: userId,
      dataSebelum: null,
      dataSesudah: { kendaraan_id: Number(kendaraan_id), is_aktif: false },
    },
    prisma
  );

  return result;
};

const restore = async (kendaraan_id, userId) => {
  const result = await vehicleRepository.restore(kendaraan_id, userId);

  if (!result) {
    throw new AppError("Kendaraan tidak ditemukan.", 404);
  }

  if (result.alreadyActive) {
    throw new AppError("Kendaraan sudah aktif.", 400);
  }

  await createAuditLog(
    {
      entityType: "kendaraan",
      entityId: Number(kendaraan_id),
      aksi: "restore",
      actorId: userId,
      dataSebelum: null,
      dataSesudah: { kendaraan_id: Number(kendaraan_id), is_aktif: true },
    },
    prisma
  );

  return result;
};

module.exports = {
  create,
  findAll,
  findByNoPolisi,
  update,
  softDelete,
  restore,
};
