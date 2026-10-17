const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "barang_id",
  "kode_perangkat",
  "nama_barang",
  "created_at",
  "updated_at",
];

const create = async (data) => {
  const { created_by, updated_by, kategori_id, satuan_default_id, ...rest } = data;

  const createData = { ...rest };

  if (created_by != null && !Number.isNaN(Number(created_by))) {
    createData.creator = { connect: { user_id: Number(created_by) } };
  }
  if (updated_by != null && !Number.isNaN(Number(updated_by))) {
    createData.updater = { connect: { user_id: Number(updated_by) } };
  }
  if (kategori_id != null && !Number.isNaN(Number(kategori_id))) {
    createData.kategori = { connect: { kategori_id: Number(kategori_id) } };
  }
  if (satuan_default_id != null && !Number.isNaN(Number(satuan_default_id))) {
    createData.satuan_default = { connect: { satuan_id: Number(satuan_default_id) } };
  }

  return await prisma.barang.create({ data: createData });
};

const findByKode = async (kode_perangkat, options = {}) => {
  if (options.includeInactive) {
    return await prisma.barang.findUnique({
      where: { kode_perangkat },
      include: {
        creator: { select: { nama: true } },
        updater: { select: { nama: true } },
      },
    });
  }

  return await prisma.barang.findFirst({
    where: {
      kode_perangkat,
    },
    include: {
      creator: { select: { nama: true } },
      updater: { select: { nama: true } },
    },
  });
};

const findAll = async ({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
  sortBy = "updated_at",
  sortOrder = "desc",
  kategori_id,
  satuan_default_id,
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

  if (kategori_id !== undefined && kategori_id !== null && kategori_id !== "") {
    where.kategori_id = Number(kategori_id);
  }

  if (satuan_default_id !== undefined && satuan_default_id !== null && satuan_default_id !== "") {
    where.satuan_default_id = Number(satuan_default_id);
  }

  if (search) {
    where.OR = [
      {
        kode_perangkat: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        nama_barang: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const total = await prisma.barang.count({
    where,
  });

  const data = await prisma.barang.findMany({
    where,
    orderBy: {
      [orderField]: orderDirection,
    },
    skip: (sanitizedPage - 1) * sanitizedLimit,
    take: sanitizedLimit,
    include: {
      kategori: true,
      satuan_default: true,
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

const update = async (barang_id, data) => {
  const { updated_by, kategori_id, satuan_default_id, ...rest } = data;

  const updateData = { ...rest };

  if (updated_by != null && !Number.isNaN(Number(updated_by))) {
    updateData.updater = { connect: { user_id: Number(updated_by) } };
  }
  if (kategori_id != null && !Number.isNaN(Number(kategori_id))) {
    updateData.kategori = { connect: { kategori_id: Number(kategori_id) } };
  }
  if (satuan_default_id != null && !Number.isNaN(Number(satuan_default_id))) {
    updateData.satuan_default = { connect: { satuan_id: Number(satuan_default_id) } };
  }

  return await prisma.barang.update({
    where: { barang_id: Number(barang_id) },
    data: updateData,
  });
};

const remove = async (barang_id) => {
  const existing = await prisma.barang.findUnique({
    where: { barang_id: Number(barang_id) },
    select: { barang_id: true },
  });

  if (!existing) {
    return null;
  }

  const relations = await Promise.all([
    prisma.boq_item.count({ where: { barang_id: Number(barang_id) } }),
    prisma.surat_jalan_item.count({ where: { barang_id: Number(barang_id) } }),
    prisma.stok_gudang.count({ where: { barang_id: Number(barang_id) } }),
    prisma.stok_ledger.count({ where: { barang_id: Number(barang_id) } }),
    prisma.permintaan_boq.count({ where: { barang_id: Number(barang_id) } }),
  ]);

  const [
    boqItemCount,
    suratJalanItemCount,
    stokGudangCount,
    stokLedgerCount,
    permintaanBoqCount,
  ] = relations;

  const hasRelation =
    boqItemCount > 0 ||
    suratJalanItemCount > 0 ||
    stokGudangCount > 0 ||
    stokLedgerCount > 0 ||
    permintaanBoqCount > 0;

  if (hasRelation) {
    return {
      blocked: true,
      counts: {
        boq_item: boqItemCount,
        surat_jalan_item: suratJalanItemCount,
        stok_gudang: stokGudangCount,
        stok_ledger: stokLedgerCount,
        permintaan_boq: permintaanBoqCount,
      },
    };
  }

  await prisma.barang.delete({
    where: { barang_id: Number(barang_id) },
  });

  return { blocked: false, deleted: true };
};

module.exports = {
  create,
  findByKode,
  findAll,
  update,
  remove,
};
