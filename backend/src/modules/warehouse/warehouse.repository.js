const prisma = require("../../config/prisma");

// Halaman form surat jalan (inbound/outbound) memuat seluruh gudang untuk mengisi
// dropdown tujuan. Nilai lama 10 membuat gudang terpotong diam-diam sehingga
// gudang dadakan/transit milik project tertentu bisa tidak pernah muncul.
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;
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
  is_internal,
  tipe,
} = {}) => {
  const sanitizedPage = Math.max(
    parseInt(page, 10) || DEFAULT_PAGE,
    DEFAULT_PAGE
  );

  const sanitizedLimit = Math.min(
    Math.max(
      parseInt(limit, 10) || DEFAULT_LIMIT,
      1
    ),
    MAX_LIMIT
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

  if (is_aktif === "false") {
    where.is_aktif = false;
  } else {
    where.is_aktif = true;
  }

  if (is_internal === "true") {
    where.is_internal = true;
  } else if (is_internal === "false") {
    where.is_internal = false;
  }

  if (tipe) {
    where.tipe = tipe;
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

const getStockAvailability = async (gudang_id, items = [], projectId = null) => {
  const results = [];

  for (const item of items) {
    const barangId = Number(item.barang_id);
    const kondisi = item.kondisi || "baik";
    const zonaId = item.zona_id ? Number(item.zona_id) : null;

    const where = {
      gudang_id: Number(gudang_id),
      barang_id: barangId,
      kondisi,
      ...(projectId ? { project_id: Number(projectId) } : {}),
      ...(zonaId !== null ? { zona_id: zonaId } : {}),
    };

    const agg = await prisma.stok_gudang.aggregate({
      where,
      _sum: { qty: true },
    });

    results.push({
      barang_id: barangId,
      zona_id: zonaId,
      kondisi,
      available_qty: Number(agg._sum.qty || 0),
    });
  }

  return results;
};

const getPickingStockAvailability = async (gudang_id, items = [], projectId = null) => {
  const barangIds = items
    .map((it) => Number(it.barang_id))
    .filter((id) => !Number.isNaN(id) && id > 0);

  if (!barangIds.length) {
    return [];
  }

  const stockWhere = {
    gudang_id: Number(gudang_id),
    barang_id: { in: barangIds },
  };

  const stocks = await prisma.stok_gudang.findMany({
    where: stockWhere,
    select: {
      barang_id: true,
      zona_id: true,
      kondisi: true,
      qty: true,
    },
  });

  const grouped = new Map();
  for (const row of stocks) {
    const key = `${row.barang_id}|${row.zona_id ?? "global"}|${row.kondisi}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        barang_id: Number(row.barang_id),
        zona_id: row.zona_id ? Number(row.zona_id) : null,
        kondisi: row.kondisi,
        available_qty: 0,
      });
    }
    grouped.get(key).available_qty += Number(row.qty || 0);
  }

  const byBarang = new Map();
  for (const entry of grouped.values()) {
    if (!byBarang.has(entry.barang_id)) {
      byBarang.set(entry.barang_id, []);
    }
    byBarang.get(entry.barang_id).push(entry);
  }

  const result = [];
  const barangDenganStok = new Set();
  for (const [barang_id, zonas] of byBarang.entries()) {
    barangDenganStok.add(barang_id);
    result.push({
      barang_id: Number(barang_id),
      zonas,
    });
  }

  for (const barangId of barangIds) {
    if (!barangDenganStok.has(barangId)) {
      result.push({
        barang_id: Number(barangId),
        zonas: [],
      });
    }
  }

  return result;
};

const getPickingAvailability = async (gudang_id, items = [], projectId = null) => {
  const results = [];

  for (const item of items) {
    const barangId = Number(item.barang_id);
    const zonaId = item.zona_id ? Number(item.zona_id) : null;
    const requestedKondisi = String(item.kondisi || "baik").toLowerCase();
    const requestedQty = Number(item.qty || 0);

    if (!barangId || !zonaId) {
      results.push({
        item_id: item.item_id,
        barang_id: barangId,
        requested_kondisi: requestedKondisi,
        requested_qty: requestedQty,
        requested_available: 0,
        status: zonaId ? "no_stock" : "no_zone",
        alternatives: [],
        message: zonaId ? null : "Zona belum dipilih.",
      });
      continue;
    }

    const stockWhere = {
      gudang_id: Number(gudang_id),
      barang_id: barangId,
      zona_id: zonaId,
    };

    const requestedStock = await prisma.stok_gudang.findFirst({
      where: {
        ...stockWhere,
        kondisi: requestedKondisi,
      },
      select: { qty: true },
    });

    const requestedAvailable = Number(requestedStock?.qty || 0);

    const allStocks = await prisma.stok_gudang.findMany({
      where: stockWhere,
      select: {
        kondisi: true,
        qty: true,
      },
    });

    const alternatives = [];
    for (const s of allStocks) {
      if (String(s.kondisi).toLowerCase() === requestedKondisi) continue;
      alternatives.push({
        kondisi: String(s.kondisi).toLowerCase(),
        qty: Number(s.qty || 0),
        zona_id: zonaId,
      });
    }

    let status = "ok";
    let message = null;

    if (requestedAvailable >= requestedQty) {
      status = "ok";
    } else if (alternatives.length > 0) {
      status = "override_available";
      message = `Stok kondisi ${requestedKondisi} tidak cukup (tersedia: ${requestedAvailable}, dibutuhkan: ${requestedQty}).`;
    } else {
      status = "no_stock";
      message = `Stok kondisi ${requestedKondisi} tidak tersedia di zona ini.`;
    }

    results.push({
      item_id: item.item_id,
      barang_id: barangId,
      requested_kondisi: requestedKondisi,
      requested_qty: requestedQty,
      requested_available: requestedAvailable,
      status,
      alternatives,
      message,
    });
  }

  return results;
};

module.exports = {
  create,
  findById,
  findByNama,
  findAll,
  update,
  softDelete,
  restore,
  getStockAvailability,
  getPickingStockAvailability,
  getPickingAvailability,
};
