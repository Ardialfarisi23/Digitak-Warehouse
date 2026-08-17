const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "satuan_id",
  "kode_satuan",
  "created_at",
  "updated_at",
];

const create = async (data) => {
  return await prisma.satuan.create({
    data,
  });
};

const findByKode = async (kode_satuan, options = {}) => {
  if (options.includeInactive) {
    return await prisma.satuan.findUnique({
      where: { kode_satuan },
    });
  }

  return await prisma.satuan.findFirst({
    where: {
      kode_satuan,
    },
  });
};

const findAll = async ({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
  sortBy = "updated_at",
  sortOrder = "desc",
} = {}) => {
  const sanitizedPage = Math.max(
    parseInt(page, 10) || DEFAULT_PAGE,
    DEFAULT_PAGE
  );

  const sanitizedLimit = Math.max(
    parseInt(limit, 10) || DEFAULT_LIMIT,
    1
  );

  const orderField = ALLOWED_SORT_FIELDS.includes(sortBy)
    ? sortBy
    : "updated_at";

  const orderDirection = ["asc", "desc"].includes(
    (sortOrder || "").toLowerCase()
  )
    ? sortOrder.toLowerCase()
    : "desc";

  const where = {};

  if (search) {
    where.OR = [
      {
        kode_satuan: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const total = await prisma.satuan.count({
    where,
  });

  const data = await prisma.satuan.findMany({
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

const update = async (satuan_id, data) => {
  return await prisma.satuan.update({
    where: { satuan_id: Number(satuan_id) },
    data,
  });
};

module.exports = {
  create,
  findByKode,
  findAll,
  update,
};
