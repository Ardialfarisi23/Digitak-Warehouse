const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "barang_id",
  "kode_perangkat",
  "nama_barang",
  "created_at",
  "updated_at",
];

const create = async (data) => {
  return await prisma.barang.create({
    data,
  });
};

const findByKode = async (kode_perangkat, options = {}) => {
  if (options.includeInactive) {
    return await prisma.barang.findUnique({
      where: { kode_perangkat },
    });
  }

  return await prisma.barang.findFirst({
    where: {
      kode_perangkat,
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
        kode_perangkat: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        nama_barang: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const total = await prisma.barang.count({
    where,
  });

  const data = await prisma.barang.findMany({
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

const update = async (barang_id, data) => {
  return await prisma.barang.update({
    where: { barang_id: Number(barang_id) },
    data,
  });
};

module.exports = {
  create,
  findByKode,
  findAll,
  update,
};
