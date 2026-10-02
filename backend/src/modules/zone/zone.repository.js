const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

// FIX: sebelumnya ada "created_at" dan "updated_at" di sini, padahal model
// zona_gudang di schema.prisma SAMA SEKALI NGGAK PUNYA kolom itu (cek
// schema: zona_id, gudang_id, kode_zona, nama_zona, tipe_zona,
// status_kecukupan, utilisasi_persen doang). Ini yang bikin
// PrismaClientValidationError "Unknown argument updated_at" tiap kali
// findAll() dipanggil tanpa parameter sortBy eksplisit (jatuh ke default
// yang salah ini).
const ALLOWED_SORT_FIELDS = ["zona_id", "nama_zona", "gudang_id"];

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
        dinilai_oleh_user: true,
      },
    });
  }

  return await prisma.zona_gudang.findFirst({
    where: {
      kode_zona,
    },
    include: {
      gudang: true,
      dinilai_oleh_user: true,
    },
  });
};

const findByKodeAndGudangId = async (kode_zona, gudang_id, options = {}) => {
  const where = {
    kode_zona,
    gudang_id: Number(gudang_id),
  };

  return await prisma.zona_gudang.findFirst({
    where,
    include: {
      gudang: true,
      dinilai_oleh_user: true,
    },
  });
};

const findAll = async ({ page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, search, sortBy = "zona_id", sortOrder = "desc" } = {}) => {
  const sanitizedPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);

  const sanitizedLimit = Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1);

  const orderField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "zona_id";

  const orderDirection = ["asc", "desc"].includes((sortOrder || "").toLowerCase()) ? sortOrder.toLowerCase() : "desc";

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
      dinilai_oleh_user: true,
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
    include: { gudang: true },
  });
};

const findById = async (zona_id) => {
  return await prisma.zona_gudang.findUnique({
    where: { zona_id: Number(zona_id) },
    include: {
      gudang: true,
      dinilai_oleh_user: true,
    },
  });
};

module.exports = {
  create,
  findByKode,
  findByKodeAndGudangId,
  findById,
  findAll,
  update,
};
