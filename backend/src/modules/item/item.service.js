const itemRepository = require("./item.repository");
const AppError = require("../../shared/errors");
const notificationService = require("../../modules/notifications/notifications.service");

const create = async (data, userId) => {
  const existing = await itemRepository.findByKode(data.kode_perangkat, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode item sudah digunakan.", 400);
  }

  const createData = {
    ...data,
    created_by: Number(userId),
    updated_by: Number(userId),
  };

  const result = await itemRepository.create(createData);

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
        title: "Item Baru Ditambahkan",
        message: `Item ${result.kode_perangkat} - ${result.nama_barang || ""} telah ditambahkan oleh staf.`,
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
  const record = await itemRepository.findByKode(kode_perangkat, { includeInactive: true });

  if (!record) {
    throw new AppError("Item tidak ditemukan.", 404);
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

module.exports = {
  create,
  findAll,
  findByKode,
  update,
};
