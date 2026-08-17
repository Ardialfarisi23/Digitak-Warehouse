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
  if (options.includeInactive) {
    return await prisma.project.findUnique({
      where: { project_id: Number(projectId) },
    });
  }

  return await prisma.project.findFirst({
    where: {
      project_id: Number(projectId),
      status_aktif: true,
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
  });

  if (all) {
    return { data, meta: null };
  }

  return {
    data,
    meta: {
      total,
      page: sanitizedPage,
      limit: sanitizedLimit,
      totalPages: Math.ceil(total / sanitizedLimit),
    },
  };
};

const update = async (projectId, data) => {
  return await prisma.project.update({
    where: { project_id: Number(projectId) },
    data,
  });
};

const softDelete = async (projectId) => {
  return await prisma.project.update({
    where: { project_id: Number(projectId) },
    data: { status_aktif: false },
  });
};

const restore = async (projectId) => {
  return await prisma.project.update({
    where: { project_id: Number(projectId) },
    data: { status_aktif: true },
  });
};

module.exports = {
  create,
  findByProjectId,
  findAll,
  update,
  softDelete,
  restore,
};
