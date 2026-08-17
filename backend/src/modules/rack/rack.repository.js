const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "rak_id",
  "kode_rak",
  "nama_rak",
  "created_at",
  "updated_at",
];

const create = async (data) => {
  return await prisma.rak.create({
    data,
  });
};

const findByKode = async (kode_rak, options = {}) => {
  if (options.includeInactive) {
    return await prisma.rak.findFirst({
      where: { kode_rak },
    });
  }

  return await prisma.rak.findFirst({
    where: {
      kode_rak,
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
        kode_rak: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        nama_rak: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const total = await prisma.rak.count({
    where,
  });

  const data = await prisma.rak.findMany({
    where,
    orderBy: {
      [orderField]: orderDirection,
    },
    skip: (sanitizedPage - 1) * sanitizedLimit,
    take: sanitizedLimit,
    include: {
      zona: true,
      bins: true,
    },
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

const update = async (rak_id, data) => {
  return await prisma.rak.update({
    where: { rak_id: Number(rak_id) },
    data,
  });
};

module.exports = {
  create,
  findByKode,
  findAll,
  update,
};
