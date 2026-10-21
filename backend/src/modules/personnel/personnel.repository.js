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
  bisa_menyetir,
  posisi,
  gudang_id,
  is_aktif,
} = {}) => {
  const isDriverFilter = bisa_menyetir === true || bisa_menyetir === "true";

  const sanitizedPage = Math.max(
    parseInt(page, 10) || DEFAULT_PAGE,
    DEFAULT_PAGE
  );

  const sanitizedLimit = isDriverFilter
    ? 1000
    : Math.max(
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

  if (isDriverFilter) {
    where.bisa_menyetir = true;
  }

  if (posisi) {
    where.posisi = posisi;
  }

  if (gudang_id !== undefined && gudang_id !== null && gudang_id !== "") {
    where.gudang_id = Number(gudang_id);
  }

  // Default: hanya personil aktif. is_aktif="true"/"false" untuk filter eksplisit.
  if (is_aktif === "true") {
    where.is_aktif = true;
  } else if (is_aktif === "false") {
    where.is_aktif = false;
  } else {
    where.is_aktif = true;
  }

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

const softDelete = async (personil_id, userId) => {
  const existing = await prisma.personil.findUnique({
    where: { personil_id: Number(personil_id) },
    select: { personil_id: true, is_aktif: true },
  });

  if (!existing) {
    return null;
  }

  const now = new Date();
  await prisma.personil.update({
    where: { personil_id: Number(personil_id) },
    data: {
      is_aktif: false,
      deleted_at: now,
      deleted_by: Number(userId),
      deleter: { connect: { user_id: Number(userId) } },
    },
  });

  return { blocked: false };
};

const restore = async (personil_id, userId) => {
  const existing = await prisma.personil.findUnique({
    where: { personil_id: Number(personil_id) },
    select: { personil_id: true, is_aktif: true },
  });

  if (!existing) {
    return null;
  }

  if (existing.is_aktif) {
    return { blocked: false, alreadyActive: true };
  }

  await prisma.personil.update({
    where: { personil_id: Number(personil_id) },
    data: {
      is_aktif: true,
      deleted_at: null,
      deleted_by: null,
      deleter: { disconnect: true },
    },
  });

  return { blocked: false };
};

module.exports = {
  create,
  findByPersonilId,
  findById,
  findByNik,
  findByEmail,
  findAll,
  update,
  softDelete,
  restore,
};
