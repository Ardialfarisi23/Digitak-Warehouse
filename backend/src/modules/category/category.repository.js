const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "kategori_id",
  "nama_kategori",
  "created_at",
  "updated_at",
];

const create = async (data) => {
  return await prisma.kategori_barang.create({
    data,
  });
};

const findByNama = async (nama_kategori, options = {}) => {
  if (options.includeInactive) {
    return await prisma.kategori_barang.findUnique({
      where: { nama_kategori },
    });
  }

  return await prisma.kategori_barang.findFirst({
    where: {
      nama_kategori,
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
        nama_kategori: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const total = await prisma.kategori_barang.count({
    where,
  });

  const data = await prisma.kategori_barang.findMany({
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

const update = async (kategori_id, data) => {
  return await prisma.kategori_barang.update({
    where: { kategori_id: Number(kategori_id) },
    data,
  });
};

module.exports = {
  create,
  findByNama,
  findAll,
  update,
};
