const permintaanBoqRepository = require("./permintaan-boq.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const { resolveFromTiket, warnNull } = require("../../utils/clusterResolver");

const normalizeStatus = (status) => {
  if (!status) return status;
  const map = {
    DIAJUKAN: "diajukan",
    DITINJAU: "ditinjau",
    DISETUJUI: "disetujui",
    DITOLAK: "ditolak",
    diajukan: "diajukan",
    ditinjau: "ditinjau",
    disetujui: "disetujui",
    ditolak: "ditolak",
  };
  return map[status.toUpperCase()] || map[status] || status.toLowerCase();
};

const create = async (data, userId) => {
  const personil = await prisma.personil.findFirst({
    where: { user_id: Number(userId) },
    select: { personil_id: true },
  });

  if (!personil) {
    throw new AppError("Data personil untuk user ini tidak ditemukan.", 400);
  }

  const tiketId = data.tiket_id ? Number(data.tiket_id) : null;
  const clusterId = tiketId
    ? await resolveFromTiket(prisma, tiketId)
    : (data.cluster_id ? String(data.cluster_id) : null);

  if (!clusterId) {
    warnNull("permintaan_boq", { tiket_id: tiketId, project_id: data.projectId });
  }

  const record = await prisma.permintaanBoq.create({
    data: {
      project_id: Number(data.projectId),
      barang_id: Number(data.barang_id),
      qty_usulan: Number(data.qty_usulan),
      alasan: data.alasan || null,
      tiket_id: tiketId,
      cluster_id: clusterId,
      diajukan_oleh: Number(personil.personil_id),
    },
    include: {
      project: true,
      barang: true,
      tiket: true,
      diajukan_user: true,
      ditinjau_user: true,
    },
  });

  return record;
};

const findAll = async (query) => {
  return await permintaanBoqRepository.findAll(query);
};

const findById = async (id) => {
  const record = await permintaanBoqRepository.findById(id);

  if (!record) {
    throw new AppError("Permintaan BOQ tidak ditemukan.", 404);
  }

  return record;
};

const updateStatus = async (id, status, userId) => {
  const record = await permintaanBoqRepository.findById(id);

  if (!record) {
    throw new AppError("Permintaan BOQ tidak ditemukan.", 404);
  }

  const normalizedStatus = normalizeStatus(status);

  if (record.status === "disetujui" || record.status === "ditolak") {
    throw new AppError("Permintaan BOQ sudah diproses.", 400);
  }

  const personil = await prisma.personil.findFirst({
    where: { user_id: Number(userId) },
    select: { personil_id: true },
  });

  if (!personil) {
    throw new AppError("Data personil untuk user ini tidak ditemukan.", 400);
  }

  const updated = await permintaanBoqRepository.updateStatus(
    id,
    normalizedStatus,
    record.diajukan_oleh,
    personil.personil_id
  );

  return updated;
};

const softDelete = async (id) => {
  const record = await permintaanBoqRepository.findById(id);

  if (!record) {
    throw new AppError("Permintaan BOQ tidak ditemukan.", 404);
  }

  return await permintaanBoqRepository.softDelete(id);
};

const restore = async (id) => {
  return await permintaanBoqRepository.restore(id);
};

const getStats = async () => {
  return await permintaanBoqRepository.getStats();
};

module.exports = {
  create,
  findAll,
  findById,
  updateStatus,
  softDelete,
  restore,
  getStats,
};
