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
    },
    include: { gudang: true },
  });
};

const findByNoPolisi = async (no_polisi, options = {}) => {
  return await prisma.kendaraan.findFirst({
    where: {
      no_polisi,
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

const remove = async (kendaraan_id) => {
  const idNum = Number(kendaraan_id);
  if (!idNum || Number.isNaN(idNum)) {
    throw new Error("ID tidak valid");
  }

  return await prisma.kendaraan.delete({
    where: { kendaraan_id: idNum },
  });
};

module.exports = {
  create,
  findByKendaraanId,
  findByNoPolisi,
  findAll,
  update,
  remove,
};
