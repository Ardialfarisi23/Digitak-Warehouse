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
      homepass_plan: true,
      pic_id: true,
      pic: {
        select: {
          personil_id: true,
          nama: true,
        },
      },
    },
    orderBy: { nama_cluster: "asc" },
  });
};

const findAll = async ({ search, status_aktif, project_id } = {}) => {
  let normalizedSearch = "";
  if (typeof search === "string") {
    normalizedSearch = search.trim();
  } else if (Array.isArray(search) && typeof search[0] === "string") {
    normalizedSearch = search[0].trim();
  }

  const where = {};

  if (project_id !== undefined && project_id !== null && project_id !== "") {
    where.project_id = Number(project_id);
  }

  if (status_aktif === "true") {
    where.status_aktif = true;
  } else if (status_aktif === "false") {
    where.status_aktif = false;
  } else {
    where.status_aktif = true;
  }

  if (normalizedSearch) {
      where.OR = [
        { nama_cluster: { contains: normalizedSearch, mode: "insensitive" } },
        { cluster_id: { contains: normalizedSearch, mode: "insensitive" } },
        { cluster_type: { contains: normalizedSearch, mode: "insensitive" } },
        { alamat_lengkap: { contains: normalizedSearch, mode: "insensitive" } },
        { vendor: { contains: normalizedSearch, mode: "insensitive" } },
        { no_tiket_release: { contains: normalizedSearch, mode: "insensitive" } },
        { kso_partner: { contains: normalizedSearch, mode: "insensitive" } },
        { project: { nama_project: { contains: normalizedSearch, mode: "insensitive" } } },
      ];
  }

  return await prisma.cluster.findMany({
    where,
    include: {
      project: {
        select: {
          project_id: true,
          nama_project: true,
          area: true,
        },
      },
      pic: {
        select: {
          personil_id: true,
          nama: true,
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
    include: {
      project: { select: { project_id: true, nama_project: true } },
      pic: { select: { personil_id: true, nama: true } },
    },
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
