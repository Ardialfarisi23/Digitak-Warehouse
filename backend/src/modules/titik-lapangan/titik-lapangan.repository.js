const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "titik_lapangan_id",
  "nama_lokasi",
  "is_aktif",
  "created_at",
  "updated_at",
];

const create = async (data) => {
  return await prisma.titik_lapangan.create({
    data,
    include: {
      project: true,
      creator: {
        select: {
          user_id: true,
          nama: true,
          email: true,
        },
      },
      updater: {
        select: {
          user_id: true,
          nama: true,
          email: true,
        },
      },
    },
  });
};

const findById = async (titik_lapangan_id) => {
  return await prisma.titik_lapangan.findUnique({
    where: { titik_lapangan_id: Number(titik_lapangan_id) },
    include: {
      project: true,
      creator: {
        select: {
          user_id: true,
          nama: true,
          email: true,
        },
      },
      updater: {
        select: {
          user_id: true,
          nama: true,
          email: true,
        },
      },
    },
  });
};

const findAll = async ({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
  sortBy = "created_at",
  sortOrder = "desc",
  project_id,
  is_aktif,
} = {}) => {
  const sanitizedPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const sanitizedLimit = Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1);

  const orderField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "created_at";
  const orderDirection = ["asc", "desc"].includes((sortOrder || "").toLowerCase())
    ? sortOrder.toLowerCase()
    : "desc";

  const where = {};

  if (project_id) {
    where.project_id = Number(project_id);
  }

  if (is_aktif === "true") {
    where.is_aktif = true;
  } else if (is_aktif === "false") {
    where.is_aktif = false;
  }

  if (search) {
    where.OR = [
      { nama_lokasi: { contains: search, mode: "insensitive" } },
      { alamat: { contains: search, mode: "insensitive" } },
    ];
  }

  const total = await prisma.titik_lapangan.count({ where });

  const data = await prisma.titik_lapangan.findMany({
    where,
    orderBy: {
      [orderField]: orderDirection,
    },
    skip: (sanitizedPage - 1) * sanitizedLimit,
    take: sanitizedLimit,
    include: {
      project: {
        select: {
          project_id: true,
          nama_project: true,
          area: true,
        },
      },
      creator: {
        select: {
          user_id: true,
          nama: true,
          email: true,
        },
      },
      updater: {
        select: {
          user_id: true,
          nama: true,
          email: true,
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

const update = async (titik_lapangan_id, data) => {
  return await prisma.titik_lapangan.update({
    where: { titik_lapangan_id: Number(titik_lapangan_id) },
    data,
    include: {
      project: true,
      creator: {
        select: {
          user_id: true,
          nama: true,
          email: true,
        },
      },
      updater: {
        select: {
          user_id: true,
          nama: true,
          email: true,
        },
      },
    },
  });
};

const softDelete = async (titik_lapangan_id) => {
  return await prisma.titik_lapangan.update({
    where: { titik_lapangan_id: Number(titik_lapangan_id) },
    data: { is_aktif: false },
  });
};

const restore = async (titik_lapangan_id) => {
  return await prisma.titik_lapangan.update({
    where: { titik_lapangan_id: Number(titik_lapangan_id) },
    data: { is_aktif: true },
  });
};

module.exports = {
  create,
  findById,
  findAll,
  update,
  softDelete,
  restore,
};
