const itemRepository = require("./item.repository");
const AppError = require("../../shared/errors");

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

  return await itemRepository.create(createData);
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

  return await itemRepository.update(record.barang_id, updateData);
};

module.exports = {
  create,
  findAll,
  findByKode,
  update,
};
