const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "zona_id",
  "nama_zona",
  "gudang_id",
  "created_at",
  "updated_at",
];

const create = async (data) => {
  return await prisma.zona_gudang.create({
    data,
  });
};

const findByKode = async (kode_zona, options = {}) => {
  if (options.includeInactive) {
    return await prisma.zona_gudang.findFirst({
      where: { kode_zona },
      include: {
        gudang: true,
        raks: {
          include: {
            bins: true,
          },
        },
      },
    });
  }

  return await prisma.zona_gudang.findFirst({
    where: {
      kode_zona,
    },
    include: {
      gudang: true,
      raks: {
        include: {
          bins: true,
        },
      },
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
        nama_zona: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const total = await prisma.zona_gudang.count({
    where,
  });

  const data = await prisma.zona_gudang.findMany({
    where,
    orderBy: {
      [orderField]: orderDirection,
    },
    skip: (sanitizedPage - 1) * sanitizedLimit,
    take: sanitizedLimit,
    include: {
      gudang: true,
      raks: {
        include: {
          bins: true,
        },
      },
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

const update = async (zona_id, data) => {
  return await prisma.zona_gudang.update({
    where: { zona_id: Number(zona_id) },
    data,
  });
};

module.exports = {
  create,
  findByKode,
  findAll,
  update,
};
