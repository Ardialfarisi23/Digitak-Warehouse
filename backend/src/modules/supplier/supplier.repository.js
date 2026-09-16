const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const ALLOWED_SORT_FIELDS = ["kode", "nama", "created_at", "updated_at"];

const create = async (data) => {
  return await prisma.supplier.create({
    data,
  });
};

const findByCode = async (kode, options = {}) => {
  if (options.includeInactive) {
    return await prisma.supplier.findUnique({
      where: { kode },
    });
  }

  return await prisma.supplier.findFirst({
    where: {
      kode,
      is_aktif: true,
    },
  });
};

const findAll = async ({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
  sortBy = "created_at",
  sortOrder = "desc",
  is_aktif,
} = {}) => {
  const sanitizedPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const sanitizedLimit = Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1);
  const orderField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "created_at";
  const orderDirection = ["asc", "desc"].includes((sortOrder || "").toLowerCase())
    ? sortOrder.toLowerCase()
    : "desc";

  const where = {};

  if (is_aktif === "true") {
    where.is_aktif = true;
  } else if (is_aktif === "false") {
    where.is_aktif = false;
  } else {
    where.is_aktif = true;
  }

  if (search) {
    where.OR = [
      { kode: { contains: search, mode: "insensitive" } },
      { nama: { contains: search, mode: "insensitive" } },
      { deskripsi: { contains: search, mode: "insensitive" } }
    ];
  }

  const total = await prisma.supplier.count({
    where,
  });

  const data = await prisma.supplier.findMany({
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

const update = async (kode, data) => {
  return await prisma.supplier.update({
    where: { kode },
    data,
  });
};

const softDelete = async (kode) => {
  return await prisma.supplier.update({
    where: { kode },
    data: { is_aktif: false },
  });
};

const restore = async (kode) => {
  return await prisma.supplier.update({
    where: { kode },
    data: { is_aktif: true },
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
