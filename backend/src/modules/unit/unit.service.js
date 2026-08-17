const unitRepository = require("./unit.repository");
const AppError = require("../../shared/errors");

const create = async (data) => {
  const existing = await unitRepository.findByKode(data.kode_satuan, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode unit sudah digunakan.", 400);
  }

  return await unitRepository.create(data);
};

const findAll = async (query) => {
  return await unitRepository.findAll(query);
};

const findByKode = async (kode_satuan) => {
  const record = await unitRepository.findByKode(kode_satuan, { includeInactive: true });

  if (!record) {
    throw new AppError("Unit tidak ditemukan.", 404);
  }

  return record;
};

const update = async (kode_satuan, data) => {
  const record = await unitRepository.findByKode(kode_satuan, { includeInactive: true });

  if (!record) {
    throw new AppError("Unit tidak ditemukan.", 404);
  }

  if (data.kode_satuan && data.kode_satuan !== kode_satuan) {
    const existing = await unitRepository.findByKode(data.kode_satuan, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode unit sudah digunakan.", 400);
    }
  }

  return await unitRepository.update(record.satuan_id, data);
};

module.exports = {
  create,
  findAll,
  findByKode,
  update,
};
