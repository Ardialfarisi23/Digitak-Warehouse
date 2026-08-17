const supplierRepository = require("./supplier.repository");
const AppError = require("../../shared/errors");

const create = async (data) => {
  const existing = await supplierRepository.findByCode(data.code, { includeInactive: true });

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

const update = async (code, data) => {
  const record = await supplierRepository.findByCode(code, { includeInactive: true });

  if (!record) {
    throw new AppError("Supplier tidak ditemukan.", 404);
  }

  if (!record.isActive) {
    throw new AppError("Supplier telah dinonaktifkan. Pulihkan untuk mengubah data.", 400);
  }
  if (data.code && data.code !== code) {
    const existing = await supplierRepository.findByCode(data.code, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode supplier sudah digunakan.", 400);
    }
  }

  return await supplierRepository.update(code, data);
};

const softDelete = async (code) => {
  const record = await supplierRepository.findByCode(code, { includeInactive: true });

  if (!record) {
    throw new AppError("Supplier tidak ditemukan.", 404);
  }

  if (!record.isActive) {
    throw new AppError("Supplier sudah dinonaktifkan.", 400);
  }

  return await supplierRepository.softDelete(code);
};

const restore = async (code) => {
  const record = await supplierRepository.findByCode(code, { includeInactive: true });

  if (!record) {
    throw new AppError("Supplier tidak ditemukan.", 404);
  }

  if (record.isActive) {
    throw new AppError("Supplier sudah aktif.", 400);
  }

  return await supplierRepository.restore(code);
};

module.exports = {
  create,
  findAll,
  findByCode,
  update,
  softDelete,
  restore,
};
