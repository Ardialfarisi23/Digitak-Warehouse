const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "gudang_id",
  "nama_gudang",
  "alamat",
  "is_aktif",
  "created_at",
  "updated_at",
];

const create = async (data) => {
  return await prisma.gudang.create({
    data,
  });
};

const findByNama = async (nama_gudang, options = {}) => {
  if (options.includeInactive) {
    return await prisma.gudang.findFirst({
      where: { nama_gudang },
    });
  }

  return await prisma.gudang.findFirst({
    where: {
      nama_gudang,
    },
  });
};

const findById = async (gudang_id) => {
  return await prisma.gudang.findUnique({
    where: { gudang_id: Number(gudang_id) },
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
    : "created_at";

  const orderDirection = ["asc", "desc"].includes(
    (sortOrder || "").toLowerCase()
  )
    ? sortOrder.toLowerCase()
    : "desc";

  const where = {};

  if (is_aktif === "true") {
    where.is_aktif = true;
  } else if (is_aktif === "false") {
    where.is_aktif = false;
  }

  if (search) {
    where.OR = [
      {
        nama_gudang: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        alamat: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        tipe: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const total = await prisma.gudang.count({
    where,
  });

  const data = await prisma.gudang.findMany({
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

const update = async (gudang_id, data) => {
  return await prisma.gudang.update({
    where: { gudang_id: Number(gudang_id) },
    data,
  });
};

const softDelete = async (gudang_id) => {
  return await prisma.gudang.update({
    where: { gudang_id: Number(gudang_id) },
    data: { is_aktif: false },
  });
};

const restore = async (gudang_id) => {
  return await prisma.gudang.update({
    where: { gudang_id: Number(gudang_id) },
    data: { is_aktif: true },
  });
};

module.exports = {
  create,
  findById,
  findByNama,
  findAll,
  update,
  softDelete,
  restore,
};
