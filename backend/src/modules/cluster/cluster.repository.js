const prisma = require("../../config/prisma");

const findByProjectId = async (projectId) => {
  return await prisma.cluster.findMany({
    where: { project_id: Number(projectId), status_aktif: true },
    select: {
      cluster_id: true,
      nama_cluster: true,
      cluster_type: true,
      project_type: true,
      kso_partner: true,
      kso_contact: true,
      no_tiket_release: true,
      vendor: true,
      alamat_lengkap: true,
    },
    orderBy: { nama_cluster: "asc" },
  });
};

const findAll = async () => {
  return await prisma.cluster.findMany({
    where: { status_aktif: true },
    include: {
      project: {
        select: {
          project_id: true,
          nama_project: true,
          area: true,
        },
      },
    },
    orderBy: [{ project_id: "asc" }, { nama_cluster: "asc" }],
  });
};

const update = async (clusterId, data) => {
  return await prisma.cluster.update({
    where: { cluster_id: clusterId },
    data,
  });
};

const toggleStatus = async (clusterId) => {
  const existing = await prisma.cluster.findUnique({
    where: { cluster_id: clusterId },
    select: { status_aktif: true },
  });

  if (!existing) {
    throw new Error("Cluster tidak ditemukan.");
  }

  return await prisma.cluster.update({
    where: { cluster_id: clusterId },
    data: { status_aktif: !existing.status_aktif },
  });
};

const create = async (data) => {
  if (!data.cluster_id) {
    throw new Error("Cluster ID wajib diisi.");
  }

  const existing = await prisma.cluster.findFirst({
    where: {
      project_id: Number(data.project_id),
      nama_cluster: data.nama_cluster,
    },
  });

  if (existing) {
    throw new Error("Cluster dengan nama tersebut sudah ada di project ini.");
  }

  return await prisma.cluster.create({
    data,
  });
};

module.exports = {
  findByProjectId,
  findAll,
  update,
  toggleStatus,
  create,
};
