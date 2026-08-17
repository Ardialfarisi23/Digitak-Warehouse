const rackRepository = require("./rack.repository");
const AppError = require("../../shared/errors");

const create = async (data) => {
  const kodeRak = data.kode_rak || data.code;
  const existing = await rackRepository.findByKode(kodeRak, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode rack sudah digunakan.", 400);
  }

  const payload = {
    ...data,
    kode_rak: kodeRak,
    nama_rak: data.nama_rak || data.name || kodeRak,
  };
  delete payload.code;
  delete payload.name;

  return await rackRepository.create(payload);
};

const findAll = async (query) => {
  return await rackRepository.findAll(query);
};

const findByKode = async (kode_rak) => {
  const record = await rackRepository.findByKode(kode_rak, { includeInactive: true });

  if (!record) {
    throw new AppError("Rack tidak ditemukan.", 404);
  }

  return record;
};

const update = async (kode_rak, data) => {
  const record = await rackRepository.findByKode(kode_rak, { includeInactive: true });

  if (!record) {
    throw new AppError("Rack tidak ditemukan.", 404);
  }

  const newKode = data.kode_rak || data.code;
  if (newKode && newKode !== kode_rak) {
    const existing = await rackRepository.findByKode(newKode, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode rack sudah digunakan.", 400);
    }
  }

  const payload = { ...data };
  if (newKode) payload.kode_rak = newKode;
  if (data.name) payload.nama_rak = data.name;
  delete payload.code;
  delete payload.name;

  return await rackRepository.update(record.rak_id, payload);
};

module.exports = {
  create,
  findAll,
  findByKode,
  update,
};
