const zoneRepository = require("./zone.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const capacityService = require("../capacity/capacity.service");

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

const updateUtilizationStatus = async (zona_id, body, userId) => {
  const zonaId = Number(zona_id);
  const { status_kecukupan, kapasitas_maksimum } = body;

  const zona = await prisma.zona_gudang.findUnique({
    where: { zona_id: zonaId },
    select: {
      zona_id: true,
      gudang_id: true,
      kapasitas_maksimum: true,
      status_kecukupan: true,
      status_kecukupan_source: true,
    },
  });

  if (!zona) {
    throw new AppError("Zona tidak ditemukan.", 404);
  }

  await prisma.$transaction(async (tx) => {
    if (kapasitas_maksimum !== undefined) {
      await tx.zona_gudang.update({
        where: { zona_id: zonaId },
        data: {
          kapasitas_maksimum: kapasitas_maksimum === null ? null : Number(kapasitas_maksimum),
        },
      });
    }

    if (status_kecukupan) {
      await tx.zona_gudang.update({
        where: { zona_id: zonaId },
        data: {
          status_kecukupan: status_kecukupan,
          status_kecukupan_source: "MANUAL",
          dinilai_oleh: Number(userId),
          dinilai_pada: new Date(),
        },
      });

      await tx.zona_utilisasi_log.create({
        data: {
          zona_id: zonaId,
          status: status_kecukupan,
          diperbarui_oleh: Number(userId),
          catatan: `Status kecukupan diperbarui menjadi ${status_kecukupan}`,
        },
      });

      return;
    }

    if (kapasitas_maksimum !== undefined) {
      await capacityService.recalculateZonaStatus(tx, zona.gudang_id, zonaId, Number(userId));
    }
  });

  const updatedZona = await prisma.zona_gudang.findUnique({
    where: { zona_id: zonaId },
    include: {
      dinilai_oleh_user: {
        select: {
          nama: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return {
    ...updatedZona,
    dinilai_oleh: updatedZona?.dinilai_oleh_user?.nama || null,
  };
};

module.exports = {
  create,
  findAll,
  findByKode,
  update,
  updateUtilizationStatus,
};
