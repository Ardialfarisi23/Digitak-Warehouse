const aisleRepository = require("./aisle.repository");
const AppError = require("../../shared/errors");

const create = async (data) => {
  const existing = await aisleRepository.findByNama(data.nama_zona, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode aisle sudah digunakan.", 400);
  }

  return await aisleRepository.create(data);
};

const findAll = async (query) => {
  return await aisleRepository.findAll(query);
};

const findByNama = async (nama_zona) => {
  const record = await aisleRepository.findByNama(nama_zona, { includeInactive: true });

  if (!record) {
    throw new AppError("Aisle tidak ditemukan.", 404);
  }

  return record;
};

const update = async (nama_zona, data) => {
  const record = await aisleRepository.findByNama(nama_zona, { includeInactive: true });

  if (!record) {
    throw new AppError("Aisle tidak ditemukan.", 404);
  }

  if (data.nama_zona && data.nama_zona !== nama_zona) {
    const existing = await aisleRepository.findByNama(data.nama_zona, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode aisle sudah digunakan.", 400);
    }
  }

  return await aisleRepository.update(record.zona_id, data);
};

module.exports = {
  create,
  findAll,
  findByNama,
  update,
};
