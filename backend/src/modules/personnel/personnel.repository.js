const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "personil_id",
  "nama",
  "posisi",
  "created_at",
  "updated_at",
];

const create = async (data) => {
  return await prisma.personil.create({
    data: {
      ...data,
      jenis: data.jenis ?? "admin_gudang",
    },
    include: {
      gudang: true,
    },
  });
};

const findByPersonilId = async (personil_id, options = {}) => {
  if (options.includeInactive) {
    return await prisma.personil.findUnique({
      where: { personil_id: Number(personil_id) },
      include: { gudang: true },
    });
  }

  return await prisma.personil.findFirst({
    where: {
      personil_id: Number(personil_id),
    },
    include: { gudang: true },
  });
};

const findById = async (id, options = {}) => {
  if (options.includeInactive) {
    return await prisma.personil.findUnique({
      where: { personil_id: Number(id) },
      include: { gudang: true },
    });
  }

  return await prisma.personil.findFirst({
    where: {
      personil_id: Number(id),
    },
    include: { gudang: true },
  });
};

const findByEmail = async (email, options = {}) => {
  if (options.includeInactive) {
    return await prisma.personil.findFirst({
      where: { email },
      include: { gudang: true },
    });
  }

  return await prisma.personil.findFirst({
    where: { email },
    include: { gudang: true },
  });
};

const findByNik = async (nik) => {
  if (!nik) return null;
  return await prisma.personil.findFirst({
    where: { nik },
    include: { gudang: true },
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
        nama: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        no_hp: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        nik: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        posisi: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const total = await prisma.personil.count({
    where,
  });

  const data = await prisma.personil.findMany({
    where,
    orderBy: {
      [orderField]: orderDirection,
    },
    skip: (sanitizedPage - 1) * sanitizedLimit,
    take: sanitizedLimit,
    include: {
      gudang: true,
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

const update = async (personil_id, data) => {
  return await prisma.personil.update({
    where: { personil_id: Number(personil_id) },
    data,
  });
};

const remove = async (personil_id) => {
  try {
    return await prisma.personil.delete({
      where: { personil_id: Number(personil_id) },
    });
  } catch (err) {
    if (err && err.code === "P2003") {
      return await prisma.personil.update({
        where: { personil_id: Number(personil_id) },
        data: { is_aktif: false },
      });
    }

    throw err;
  }
};

module.exports = {
  create,
  findByPersonilId,
  findById,
  findByNik,
  findByEmail,
  findAll,
  update,
  remove,
};
