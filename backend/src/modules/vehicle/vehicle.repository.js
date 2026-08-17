const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "kendaraan_id",
  "jenis_kendaraan",
  "merk",
  "no_polisi",
  "created_at",
  "updated_at",
];

const create = async (data) => {
  return await prisma.kendaraan.create({
    data,
  });
};

const findByKendaraanId = async (kendaraan_id, options = {}) => {
  if (options.includeInactive) {
    return await prisma.kendaraan.findUnique({
      where: { kendaraan_id: Number(kendaraan_id) },
    });
  }

  return await prisma.kendaraan.findFirst({
    where: {
      kendaraan_id: Number(kendaraan_id),
    },
  });
};

const findByNoPolisi = async (no_polisi, options = {}) => {
  return await prisma.kendaraan.findFirst({
    where: {
      no_polisi,
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
        jenis_kendaraan: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        merk: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        no_polisi: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const total = await prisma.kendaraan.count({
    where,
  });

  const data = await prisma.kendaraan.findMany({
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

const update = async (kendaraan_id, data) => {
  return await prisma.kendaraan.update({
    where: { kendaraan_id: Number(kendaraan_id) },
    data,
  });
};

module.exports = {
  create,
  findByKendaraanId,
  findByNoPolisi,
  findAll,
  update,
};
