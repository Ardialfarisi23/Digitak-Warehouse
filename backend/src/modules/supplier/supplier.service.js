const supplierRepository = require("./supplier.repository");
const AppError = require("../../shared/errors");

const create = async (data) => {
  const existing = await supplierRepository.findByCode(data.kode, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode supplier sudah digunakan.", 400);
  }

  return await supplierRepository.create(data);
};

const findAll = async (query) => {
  return await supplierRepository.findAll(query);
};

const findByCode = async (code) => {
  const record = await supplierRepository.findByCode(code, { includeInactive: true });

  if (!record) {
    throw new AppError("Supplier tidak ditemukan.", 404);
  }

  return record;
};

const update = async (kode, data) => {
  const record = await supplierRepository.findByCode(kode, { includeInactive: true });

  if (!record) {
    throw new AppError("Supplier tidak ditemukan.", 404);
  }

  if (!record.is_aktif) {
    throw new AppError("Supplier telah dinonaktifkan. Pulihkan untuk mengubah data.", 400);
  }
  if (data.kode && data.kode !== kode) {
    const existing = await supplierRepository.findByCode(data.kode, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode supplier sudah digunakan.", 400);
    }
  }

  return await supplierRepository.update(kode, data);
};

const softDelete = async (kode) => {
  const record = await supplierRepository.findByCode(kode, { includeInactive: true });

  if (!record) {
    throw new AppError("Supplier tidak ditemukan.", 404);
  }

  if (!record.is_aktif) {
    throw new AppError("Supplier sudah dinonaktifkan.", 400);
  }

  return await supplierRepository.softDelete(kode);
};

const restore = async (kode) => {
  const record = await supplierRepository.findByCode(kode, { includeInactive: true });

  if (!record) {
    throw new AppError("Supplier tidak ditemukan.", 404);
  }

  if (record.is_aktif) {
    throw new AppError("Supplier sudah aktif.", 400);
  }

  return await supplierRepository.restore(kode);
};

module.exports = {
  create,
  findAll,
  findByCode,
  update,
  softDelete,
  restore,
};
