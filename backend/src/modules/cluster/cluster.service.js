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

module.exports = {
  findByProjectId,
  findAll,
  create,
  update,
  toggleStatus,
};
