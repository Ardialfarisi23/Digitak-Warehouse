const binRepository = require("./bin.repository");
const AppError = require("../../shared/errors");

const create = async (data) => {
  const kodeBin = data.kode_bin || data.code;
  const existing = await binRepository.findByKode(kodeBin, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode bin sudah digunakan.", 400);
  }

  const payload = {
    ...data,
    kode_bin: kodeBin,
  };
  delete payload.code;

  return await binRepository.create(payload);
};

const findAll = async (query) => {
  return await binRepository.findAll(query);
};

const findByKode = async (kode_bin) => {
  const record = await binRepository.findByKode(kode_bin, { includeInactive: true });

  if (!record) {
    throw new AppError("Bin tidak ditemukan.", 404);
  }

  return record;
};

const update = async (kode_bin, data) => {
  const record = await binRepository.findByKode(kode_bin, { includeInactive: true });

  if (!record) {
    throw new AppError("Bin tidak ditemukan.", 404);
  }

  const newKode = data.kode_bin || data.code;
  if (newKode && newKode !== kode_bin) {
    const existing = await binRepository.findByKode(newKode, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode bin sudah digunakan.", 400);
    }
  }

  const payload = { ...data };
  if (newKode) payload.kode_bin = newKode;
  delete payload.code;

  return await binRepository.update(record.bin_id, payload);
};

module.exports = {
  create,
  findAll,
  findByKode,
  update,
};
