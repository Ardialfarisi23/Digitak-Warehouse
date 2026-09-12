const vehicleRepository = require("./vehicle.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const notificationService = require("../../modules/notifications/notifications.service");

const create = async (data, userId) => {
  const existing = await vehicleRepository.findByNoPolisi(data.no_polisi, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode vehicle sudah digunakan.", 400);
  }

  const selectedGudangId = data.gudang_id || data.gudangId || data.warehouseId || null;

  const createData = {
    ...data,
    gudang_id: selectedGudangId,
    created_by: Number(userId),
    updated_by: Number(userId),
  };

  const result = await vehicleRepository.create(createData);

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
  const record = await vehicleRepository.findByNoPolisi(no_polisi, { includeInactive: true });

  if (!record) {
    throw new AppError("Vehicle tidak ditemukan.", 404);
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
    if (existing) {
      throw new AppError("Kode vehicle sudah digunakan.", 400);
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

const remove = async (kendaraan_id, userId) => {
  const record = await vehicleRepository.findByKendaraanId(kendaraan_id, { includeInactive: true });

  if (!record) {
    throw new AppError("Vehicle tidak ditemukan.", 404);
  }

  try {
    return await vehicleRepository.remove(kendaraan_id);
  } catch (err) {
    if (err && err.code === "P2003") {
      throw new AppError("Vehicle masih terikat dengan data lain dan tidak dapat dihapus permanen.", 400);
    }

    throw err;
  }
};

module.exports = {
  create,
  findAll,
  findByNoPolisi,
  update,
  remove,
};
