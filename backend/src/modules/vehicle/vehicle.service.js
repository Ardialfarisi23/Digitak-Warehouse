const vehicleRepository = require("./vehicle.repository");
const AppError = require("../../shared/errors");

const create = async (data, userId) => {
  const existing = await vehicleRepository.findByNoPolisi(data.no_polisi, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode vehicle sudah digunakan.", 400);
  }

  const createData = {
    ...data,
    created_by: Number(userId),
    updated_by: Number(userId),
  };

  return await vehicleRepository.create(createData);
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

  const updateData = {
    ...data,
    updated_by: Number(userId),
  };

  return await vehicleRepository.update(record.kendaraan_id, updateData);
};

module.exports = {
  create,
  findAll,
  findByNoPolisi,
  update,
};
