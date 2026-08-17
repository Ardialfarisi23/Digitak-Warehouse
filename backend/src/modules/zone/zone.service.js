const zoneRepository = require("./zone.repository");
const AppError = require("../../shared/errors");

const create = async (data) => {
  const kodeZona = data.kode_zona || data.code;
  const existing = await zoneRepository.findByKode(kodeZona, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode zone sudah digunakan.", 400);
  }

  const payload = {
    ...data,
    kode_zona: kodeZona,
    nama_zona: data.nama_zona || data.name || kodeZona,
  };
  delete payload.code;
  delete payload.name;

  return await zoneRepository.create(payload);
};

const findAll = async (query) => {
  return await zoneRepository.findAll(query);
};

const findByKode = async (kode_zona) => {
  const record = await zoneRepository.findByKode(kode_zona, { includeInactive: true });

  if (!record) {
    throw new AppError("Zone tidak ditemukan.", 404);
  }

  return record;
};

const update = async (kode_zona, data) => {
  const record = await zoneRepository.findByKode(kode_zona, { includeInactive: true });

  if (!record) {
    throw new AppError("Zone tidak ditemukan.", 404);
  }

  const newKode = data.kode_zona || data.code;
  if (newKode && newKode !== kode_zona) {
    const existing = await zoneRepository.findByKode(newKode, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode zone sudah digunakan.", 400);
    }
  }

  const payload = { ...data };
  if (newKode) payload.kode_zona = newKode;
  if (data.name) payload.nama_zona = data.name;
  delete payload.code;
  delete payload.name;

  return await zoneRepository.update(record.zona_id, payload);
};

module.exports = {
  create,
  findAll,
  findByKode,
  update,
};
