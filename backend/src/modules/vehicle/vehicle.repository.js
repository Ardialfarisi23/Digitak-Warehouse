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
  const prismaData = {
    jenis_kendaraan: data.jenis_kendaraan,
    merk: data.merk,
    no_polisi: data.no_polisi,
    kapasitas_angkut: String(data.kapasitas_angkut || "0"),
    keterangan: data.keterangan || "",
    foto: data.foto || null,
    gudang_id: data.gudang_id || data.gudangId || data.warehouseId ? Number(data.gudang_id || data.gudangId || data.warehouseId) : null,
    created_by: data.created_by,
    updated_by: data.updated_by,
  };

  return await prisma.kendaraan.create({
    data: prismaData,
    include: {
      gudang: true,
    },
  });
};

const findByKendaraanId = async (kendaraan_id, options = {}) => {
  if (!kendaraan_id || Number.isNaN(Number(kendaraan_id))) {
    throw new Error("ID Kendaraan tidak valid atau tidak ditemukan");
  }

  const id = BigInt(kendaraan_id);

  if (options.includeInactive) {
    return await prisma.kendaraan.findUnique({
      where: { kendaraan_id: id },
      include: { gudang: true },
    });
  }

  return await prisma.kendaraan.findFirst({
    where: {
      kendaraan_id: id,
      is_aktif: true,
    },
    include: { gudang: true },
  });
};

const findByNoPolisi = async (no_polisi, options = {}) => {
  if (options.includeInactive) {
    return await prisma.kendaraan.findFirst({
      where: { no_polisi },
      include: { gudang: true },
    });
  }

  return await prisma.kendaraan.findFirst({
    where: {
      no_polisi,
      is_aktif: true,
    },
    include: { gudang: true },
  });
};

const findAll = async ({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
  sortBy = "updated_at",
  sortOrder = "desc",
  jenis_kendaraan,
  gudang_id,
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

  if (jenis_kendaraan) {
    where.jenis_kendaraan = jenis_kendaraan;
  }

  if (gudang_id !== undefined && gudang_id !== null && gudang_id !== "") {
    where.gudang_id = Number(gudang_id);
  }

  where.is_aktif = true;

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
    include: { gudang: true },
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
  const prismaData = {
    jenis_kendaraan: data.jenis_kendaraan,
    merk: data.merk,
    no_polisi: data.no_polisi,
    kapasitas_angkut: data.kapasitas_angkut !== undefined ? String(data.kapasitas_angkut) : undefined,
    keterangan: data.keterangan,
    foto: data.foto || null,
    gudang_id: data.gudang_id || data.gudangId || data.warehouseId ? Number(data.gudang_id || data.gudangId || data.warehouseId) : undefined,
    updated_by: data.updated_by,
  };

  return await prisma.kendaraan.update({
    where: { kendaraan_id: BigInt(kendaraan_id) },
    data: prismaData,
  });
};

const softDelete = async (kendaraan_id, userId) => {
  const idNum = Number(kendaraan_id);
  if (!idNum || Number.isNaN(idNum)) {
    throw new Error("ID tidak valid");
  }

  const existing = await prisma.kendaraan.findUnique({
    where: { kendaraan_id: idNum },
    select: { kendaraan_id: true, is_aktif: true, no_polisi: true },
  });

  if (!existing) {
    return null;
  }

  if (!existing.is_aktif) {
    return { blocked: false, alreadyInactive: true };
  }

  const aktifSJ = await prisma.surat_jalan.findFirst({
    where: {
      kendaraan_id: idNum,
      status: {
        notIn: ["diterima_didistribusikan", "ditolak"],
      },
    },
    select: { surat_jalan_id: true },
  });

  if (aktifSJ) {
    return { blocked: true, reason: "surat_jalan_aktif" };
  }

  const now = new Date();
  await prisma.kendaraan.update({
    where: { kendaraan_id: idNum },
    data: {
      is_aktif: false,
      deleted_at: now,
      deleted_by: Number(userId),
      deleter: { connect: { user_id: Number(userId) } },
    },
  });

  return { blocked: false };
};

const restore = async (kendaraan_id, userId) => {
  const idNum = Number(kendaraan_id);
  if (!idNum || Number.isNaN(idNum)) {
    throw new Error("ID tidak valid");
  }

  const existing = await prisma.kendaraan.findUnique({
    where: { kendaraan_id: idNum },
    select: { kendaraan_id: true, is_aktif: true },
  });

  if (!existing) {
    return null;
  }

  if (existing.is_aktif) {
    return { blocked: false, alreadyActive: true };
  }

  await prisma.kendaraan.update({
    where: { kendaraan_id: idNum },
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
  findByKendaraanId,
  findByNoPolisi,
  findAll,
  update,
  softDelete,
  restore,
};
