const clusterRepository = require("./cluster.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");

const findByProjectId = async (projectId) => {
  if (!projectId) {
    throw new AppError("Project ID wajib diisi.", 400);
  }

  return await clusterRepository.findByProjectId(projectId);
};

const findAll = async () => {
  return await clusterRepository.findAll();
};

const create = async (data, userId) => {
  if (!data.project_id) {
    throw new AppError("Project ID wajib diisi.", 400);
  }

  if (!data.nama_cluster || !data.nama_cluster.trim()) {
    throw new AppError("Nama cluster wajib diisi.", 400);
  }

  if (!data.cluster_id || !data.cluster_id.trim()) {
    throw new AppError("Cluster ID wajib diisi.", 400);
  }

  const normalizedClusterId = data.cluster_id.trim();
  const existingClusterId = await prisma.cluster.findFirst({
    where: { cluster_id: normalizedClusterId },
    select: { cluster_id: true },
  });

  if (existingClusterId) {
    throw new AppError("Cluster ID sudah digunakan, gunakan ID lain.", 409);
  }

  const createData = {
    ...data,
    cluster_id: normalizedClusterId,
    project_id: Number(data.project_id),
    status_aktif: data.status_aktif === undefined || data.status_aktif === null ? true : Boolean(data.status_aktif),
    created_by: Number(userId),
    updated_by: Number(userId),
  };

  return await clusterRepository.create(createData);
};

const update = async (clusterId, data) => {
  if (!clusterId) {
    throw new AppError("Cluster ID wajib diisi.", 400);
  }

  const updateData = {
    nama_cluster: data.nama_cluster,
    cluster_type: data.cluster_type,
    alamat_lengkap: data.alamat_lengkap,
    homepass_plan: data.homepass_plan,
  };

  return await clusterRepository.update(clusterId, updateData);
};

const toggleStatus = async (clusterId) => {
  if (!clusterId) {
    throw new AppError("Cluster ID wajib diisi.", 400);
  }

  const hasActiveBoq = await prisma.boq.findFirst({
    where: {
      cluster_id: clusterId,
      status: { in: ["draft", "aktif"] },
    },
    select: { boq_id: true },
  });

  const cluster = await clusterRepository.toggleStatus(clusterId);

  if (!cluster.status_aktif && hasActiveBoq) {
    return {
      ...cluster,
      warning: "Cluster dinonaktifkan, tetapi masih ada BOQ aktif yang menggunakan cluster ini.",
    };
  }

  return cluster;
};

const deleteCluster = async (clusterId) => {
  if (!clusterId) {
    throw new AppError("Cluster ID wajib diisi.", 400);
  }

  const existing = await prisma.cluster.findUnique({
    where: { cluster_id: clusterId },
    select: { cluster_id: true, nama_cluster: true },
  });

  if (!existing) {
    throw new AppError("Cluster tidak ditemukan.", 404);
  }

  const relatedBoq = await prisma.boq.findFirst({
    where: { cluster_id: clusterId },
    select: { boq_id: true, status: true },
  });

  if (relatedBoq) {
    throw new AppError(`Cluster tidak dapat dihapus karena masih digunakan pada data BOQ (status: ${relatedBoq.status}). Nonaktifkan cluster jika diperlukan.`, 409);
  }

  await prisma.cluster.update({
    where: { cluster_id: clusterId },
    data: { status_aktif: false },
  });

  return { message: "Cluster berhasil dihapus." };
};

module.exports = {
  findByProjectId,
  findAll,
  create,
  update,
  toggleStatus,
  deleteCluster,
};
