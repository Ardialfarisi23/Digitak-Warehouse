const customerRepository = require("./customer.repository");
const AppError = require("../../shared/errors");

const create = async (data) => {
  const existing = await customerRepository.findByCode(data.code, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode customer sudah digunakan.", 400);
  }

  return await customerRepository.create(data);
};

const findAll = async (query) => {
  return await customerRepository.findAll(query);
};

const findByCode = async (code) => {
  const record = await customerRepository.findByCode(code, { includeInactive: true });

  if (!record) {
    throw new AppError("Customer tidak ditemukan.", 404);
  }

  return record;
};

const update = async (code, data) => {
  const record = await customerRepository.findByCode(code, { includeInactive: true });

  if (!record) {
    throw new AppError("Customer tidak ditemukan.", 404);
  }

  if (!record.isActive) {
    throw new AppError("Customer telah dinonaktifkan. Pulihkan untuk mengubah data.", 400);
  }
  if (data.code && data.code !== code) {
    const existing = await customerRepository.findByCode(data.code, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode customer sudah digunakan.", 400);
    }
  }

  return await customerRepository.update(code, data);
};

const softDelete = async (code) => {
  const record = await customerRepository.findByCode(code, { includeInactive: true });

  if (!record) {
    throw new AppError("Customer tidak ditemukan.", 404);
  }

  if (!record.isActive) {
    throw new AppError("Customer sudah dinonaktifkan.", 400);
  }

  return await customerRepository.softDelete(code);
};

const restore = async (code) => {
  const record = await customerRepository.findByCode(code, { includeInactive: true });

  if (!record) {
    throw new AppError("Customer tidak ditemukan.", 404);
  }

  if (record.isActive) {
    throw new AppError("Customer sudah aktif.", 400);
  }

  return await customerRepository.restore(code);
};

module.exports = {
  create,
  findAll,
  findByCode,
  update,
  softDelete,
  restore,
};
