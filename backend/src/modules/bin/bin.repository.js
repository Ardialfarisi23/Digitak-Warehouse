const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "bin_id",
  "kode_bin",
  "rak_id",
  "created_at",
  "updated_at",
];

const create = async (data) => {
  return await prisma.bin_lokasi.create({
    data,
  });
};

const findByKode = async (kode_bin, options = {}) => {
  if (options.includeInactive) {
    return await prisma.bin_lokasi.findFirst({
      where: { kode_bin },
    });
  }

  return await prisma.bin_lokasi.findFirst({
    where: {
      kode_bin,
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
        kode_bin: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const total = await prisma.bin_lokasi.count({
    where,
  });

  const data = await prisma.bin_lokasi.findMany({
    where,
    orderBy: {
      [orderField]: orderDirection,
    },
    skip: (sanitizedPage - 1) * sanitizedLimit,
    take: sanitizedLimit,
    include: {
      rak: {
        include: {
          zona: true,
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

const update = async (bin_id, data) => {
  return await prisma.bin_lokasi.update({
    where: { bin_id: Number(bin_id) },
    data,
  });
};

module.exports = {
  create,
  findByKode,
  findAll,
  update,
};
