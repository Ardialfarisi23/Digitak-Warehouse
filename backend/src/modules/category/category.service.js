const categoryRepository = require("./category.repository");
const AppError = require("../../shared/errors");

const create = async (data) => {
  const existing = await categoryRepository.findByNama(data.nama_kategori, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode category sudah digunakan.", 400);
  }

  return await categoryRepository.create(data);
};

const findAll = async (query) => {
  return await categoryRepository.findAll(query);
};

const findByNama = async (nama_kategori) => {
  const record = await categoryRepository.findByNama(nama_kategori, { includeInactive: true });

  if (!record) {
    throw new AppError("Category tidak ditemukan.", 404);
  }

  return record;
};

const update = async (nama_kategori, data) => {
  const record = await categoryRepository.findByNama(nama_kategori, { includeInactive: true });

  if (!record) {
    throw new AppError("Category tidak ditemukan.", 404);
  }

  if (data.nama_kategori && data.nama_kategori !== nama_kategori) {
    const existing = await categoryRepository.findByNama(data.nama_kategori, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode category sudah digunakan.", 400);
    }
  }

  return await categoryRepository.update(record.kategori_id, data);
};

module.exports = {
  create,
  findAll,
  findByNama,
  update,
};
