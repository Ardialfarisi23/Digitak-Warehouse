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
    await notificationService.create({
      role: "admin_general",
      type: "info",
      title: "Item Baru Ditambahkan",
      message: `Item ${result.kode_perangkat} - ${result.nama_barang || ""} telah ditambahkan oleh staf.`,
      link: "/dashboard/master-data",
    });
    await notificationService.create({
      role: "supervisor",
      type: "info",
      title: "Item Baru Ditambahkan",
      message: `Item ${result.kode_perangkat} - ${result.nama_barang || ""} telah ditambahkan oleh staf.`,
      link: "/dashboard/master-data",
    });
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
    await notificationService.create({
      role: "admin_general",
      type: "info",
      title: "Item Diperbarui",
      message: `Item ${result.kode_perangkat} - ${result.nama_barang || ""} telah diperbarui.`,
      link: "/dashboard/master-data",
    });
    await notificationService.create({
      role: "supervisor",
      type: "info",
      title: "Item Diperbarui",
      message: `Item ${result.kode_perangkat} - ${result.nama_barang || ""} telah diperbarui.`,
      link: "/dashboard/master-data",
    });
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
