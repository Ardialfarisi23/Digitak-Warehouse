const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const ALLOWED_SORT_FIELDS = ["code", "name", "createdAt", "updatedAt"];

const create = async (data) => {
  return await prisma.aisle.create({
    data,
  });
};

const findByCode = async (code, options = {}) => {
  if (options.includeInactive) {
    return await prisma.aisle.findUnique({
      where: { code },
    });
  }

  return await prisma.aisle.findFirst({
    where: {
      code,
      isActive: true,
    },
  });
};

const findAll = async ({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
  sortBy = "createdAt",
  sortOrder = "desc",
  isActive,
} = {}) => {
  const sanitizedPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const sanitizedLimit = Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1);
  const orderField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";
  const orderDirection = ["asc", "desc"].includes((sortOrder || "").toLowerCase())
    ? sortOrder.toLowerCase()
    : "desc";

  const where = {};

  if (isActive === "true") {
    where.isActive = true;
  } else if (isActive === "false") {
    where.isActive = false;
  } else {
    where.isActive = true;
  }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } }
    ];
  }

  const total = await prisma.aisle.count({
    where,
  });

  const data = await prisma.aisle.findMany({
    where,
    orderBy: {
      [orderField]: orderDirection,
    },
    skip: (sanitizedPage - 1) * sanitizedLimit,
    take: sanitizedLimit,
  });

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

const update = async (code, data) => {
  return await prisma.aisle.update({
    where: { code },
    data,
  });
};

const softDelete = async (code) => {
  return await prisma.aisle.update({
    where: { code },
    data: { isActive: false },
  });
};

const restore = async (code) => {
  return await prisma.aisle.update({
    where: { code },
    data: { isActive: true },
  });
};

module.exports = {
  create,
  findByCode,
  findAll,
  update,
  softDelete,
  restore,
};
