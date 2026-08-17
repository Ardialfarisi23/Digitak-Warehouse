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
    data,
  });
};

const findByPersonilId = async (personil_id, options = {}) => {
  if (options.includeInactive) {
    return await prisma.personil.findUnique({
      where: { personil_id: Number(personil_id) },
    });
  }

  return await prisma.personil.findFirst({
    where: {
      personil_id: Number(personil_id),
    },
  });
};

const findById = async (id, options = {}) => {
  if (options.includeInactive) {
    return await prisma.personil.findUnique({
      where: { personil_id: Number(id) },
    });
  }

  return await prisma.personil.findFirst({
    where: {
      personil_id: Number(id),
    },
  });
};

const findByEmail = async (email, options = {}) => {
  if (options.includeInactive) {
    return await prisma.personil.findFirst({
      where: { email },
    });
  }

  return await prisma.personil.findFirst({
    where: {
      email,
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

module.exports = {
  create,
  findByPersonilId,
  findById,
  findByEmail,
  findAll,
  update,
};
