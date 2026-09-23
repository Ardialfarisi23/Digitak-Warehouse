const titikLapanganRepository = require("./titik-lapangan.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const notificationService = require("../../modules/notifications/notifications.service");

const create = async (data, userId) => {
  const project = await prisma.project.findUnique({
    where: { project_id: Number(data.project_id) },
  });

  if (!project) {
    throw new AppError("Project tidak ditemukan.", 404);
  }

  const createData = {
    ...data,
    project_id: Number(data.project_id),
    created_by: Number(userId),
    updated_by: Number(userId),
  };

  const result = await titikLapanganRepository.create(createData);

  try {
    await notificationService.create({
      userId: project.created_by,
      type: "info",
      title: "Titik Lapangan Baru",
      message: `Titik lapangan "${result.nama_lokasi}" telah ditambahkan ke project "${project.nama_project}".`,
      link: `/dashboard/master-data`,
    });
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi create titik lapangan:", notifErr);
  }

  await prisma.audit_log.create({
    data: {
      entity_type: "titik_lapangan",
      entity_id: BigInt(result.titik_lapangan_id),
      aksi: "create",
      actor_id: BigInt(userId),
      data_sebelum: null,
      data_sesudah: {
        nama_lokasi: result.nama_lokasi,
        project_id: result.project_id,
        latitude: result.latitude,
        longitude: result.longitude,
      },
    },
  });

  return result;
};

const findAll = async (query = {}) => {
  return await titikLapanganRepository.findAll(query);
};

const findById = async (titik_lapangan_id) => {
  const record = await titikLapanganRepository.findById(titik_lapangan_id);

  if (!record) {
    throw new AppError("Titik lapangan tidak ditemukan.", 404);
  }

  return record;
};

const update = async (titik_lapangan_id, data, userId) => {
  const record = await titikLapanganRepository.findById(titik_lapangan_id);

  if (!record) {
    throw new AppError("Titik lapangan tidak ditemukan.", 404);
  }

  if (!record.is_aktif) {
    throw new AppError("Titik lapangan telah dinonaktifkan. Pulihkan untuk mengubah data.", 400);
  }

  const updateData = {
    ...data,
    updated_by: Number(userId),
  };

  const result = await titikLapanganRepository.update(titik_lapangan_id, updateData);

  await prisma.audit_log.create({
    data: {
      entity_type: "titik_lapangan",
      entity_id: BigInt(titik_lapangan_id),
      aksi: "update",
      actor_id: BigInt(userId),
      data_sebelum: {
        nama_lokasi: record.nama_lokasi,
        latitude: record.latitude,
        longitude: record.longitude,
        alamat: record.alamat,
      },
      data_sesudah: {
        nama_lokasi: result.nama_lokasi,
        latitude: result.latitude,
        longitude: result.longitude,
        alamat: result.alamat,
      },
    },
  });

  return result;
};

const softDelete = async (titik_lapangan_id, userId) => {
  const record = await titikLapanganRepository.findById(titik_lapangan_id);

  if (!record) {
    throw new AppError("Titik lapangan tidak ditemukan.", 404);
  }

  const result = await titikLapanganRepository.softDelete(titik_lapangan_id);

  try {
    await prisma.audit_log.create({
      data: {
        entity_type: "titik_lapangan",
        entity_id: BigInt(titik_lapangan_id),
        aksi: "soft_delete",
        actor_id: BigInt(userId),
        data_sebelum: { is_aktif: record.is_aktif },
        data_sesudah: { is_aktif: false },
      },
    });
  } catch (auditErr) {
    console.error("Gagal membuat audit log soft_delete titik lapangan:", auditErr);
  }

  return result;
};

const restore = async (titik_lapangan_id, userId) => {
  const record = await titikLapanganRepository.findById(titik_lapangan_id);

  if (!record) {
    throw new AppError("Titik lapangan tidak ditemukan.", 404);
  }

  const result = await titikLapanganRepository.restore(titik_lapangan_id);

  try {
    await prisma.audit_log.create({
      data: {
        entity_type: "titik_lapangan",
        entity_id: BigInt(titik_lapangan_id),
        aksi: "restore",
        actor_id: BigInt(userId),
        data_sebelum: { is_aktif: record.is_aktif },
        data_sesudah: { is_aktif: true },
      },
    });
  } catch (auditErr) {
    console.error("Gagal membuat audit log restore titik lapangan:", auditErr);
  }

  return result;
};

module.exports = {
  create,
  findAll,
  findById,
  update,
  softDelete,
  restore,
};
