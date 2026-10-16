const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const ALLOWED_SORT_FIELDS = ["project_id", "nama_project", "area", "klien", "status_aktif", "created_at", "updated_at"];

const create = async (data) => {
  return await prisma.project.create({
    data,
  });
};

const findByProjectId = async (projectId, options = {}) => {
  if (!projectId || Number.isNaN(Number(projectId))) {
    throw new Error("ID Project tidak valid atau tidak ditemukan");
  }

  const id = BigInt(projectId);

  if (options.includeInactive) {
    return await prisma.project.findUnique({
      where: { project_id: id },
      include: {
        creator: { select: { nama: true } },
        updater: { select: { nama: true } },
      },
    });
  }

  return await prisma.project.findFirst({
    where: {
      project_id: id,
      status_aktif: true,
    },
    include: {
      creator: { select: { nama: true } },
      updater: { select: { nama: true } },
    },
  });
};

const findAll = async ({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
  sortBy = "created_at",
  sortOrder = "desc",
  status_aktif,
  all,
} = {}) => {
  const sanitizedPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const sanitizedLimit = Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1);
  const orderField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "created_at";
  const orderDirection = ["asc", "desc"].includes((sortOrder || "").toLowerCase())
    ? sortOrder.toLowerCase()
    : "desc";

  const where = {};

  if (status_aktif === "true") {
    where.status_aktif = true;
  } else if (status_aktif === "false") {
    where.status_aktif = false;
  } else {
    where.status_aktif = true;
  }

  if (search) {
    where.OR = [
      { nama_project: { contains: search, mode: "insensitive" } },
      { area: { contains: search, mode: "insensitive" } },
      { klien: { contains: search, mode: "insensitive" } },
    ];
  }

  const total = all ? undefined : await prisma.project.count({
    where,
  });

  const data = await prisma.project.findMany({
    where,
    orderBy: {
      [orderField]: orderDirection,
    },
    skip: all ? undefined : (sanitizedPage - 1) * sanitizedLimit,
    take: all ? undefined : sanitizedLimit,
    include: {
      creator: { select: { nama: true } },
      updater: { select: { nama: true } },
      _count: {
        select: {
          clusters: true,
        },
      },
    },
  });

  const projectIds = data.map((p) => p.project_id);
  let activeMap = {};
  if (projectIds.length > 0) {
    const activeCounts = await prisma.cluster.groupBy({
      by: ["project_id"],
      where: {
        project_id: { in: projectIds },
        status_aktif: true,
      },
      _count: { _all: true },
    });
    activeMap = Object.fromEntries(
      activeCounts.map((g) => [g.project_id.toString(), g._count._all])
    );
  }
  const result = data.map((p) => ({
    ...p,
    cluster_aktif_count: activeMap[p.project_id.toString()] ?? 0,
  }));

  if (all) {
    return { data: result, meta: null };
  }

  return {
    data: result,
    meta: {
      total,
      page: sanitizedPage,
      limit: sanitizedLimit,
      totalPages: Math.ceil(total / sanitizedLimit),
    },
  };
};

const update = async (projectId, data) => {
  const id = BigInt(projectId);
  return await prisma.project.update({
    where: { project_id: id },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
};

const softDelete = async (projectId) => {
  const id = BigInt(projectId);
  return await prisma.project.update({
    where: { project_id: id },
    data: { status_aktif: false },
  });
};

const restore = async (projectId) => {
  const id = BigInt(projectId);
  return await prisma.project.update({
    where: { project_id: id },
    data: { status_aktif: true },
  });
};

const remove = async (projectId) => {
  const idNum = Number(projectId);
  if (!idNum || Number.isNaN(idNum)) {
    throw new Error("ID tidak valid");
  }

  return await prisma.project.delete({
    where: { project_id: idNum },
  });
};

module.exports = {
  create,
  findByProjectId,
  findAll,
  update,
  remove,
  softDelete,
  restore,
};
