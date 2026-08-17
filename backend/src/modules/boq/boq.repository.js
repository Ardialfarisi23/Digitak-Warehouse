const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const ALLOWED_SORT_FIELDS = ["boq_id", "status", "tanggal_aktivasi", "created_at", "updated_at"];

const create = async (data) => {
  return await prisma.boq.create({
    data,
    include: {
      tiket: true,
      items: {
        include: {
          barang: true,
          satuan: true,
          gudang_tujuan: true,
        },
      },
      diaktifkan_user: true,
    },
  });
};

const findById = async (boq_id) => {
  return await prisma.boq.findUnique({
    where: { boq_id: Number(boq_id) },
    include: {
      tiket: {
        include: {
          project: true,
        },
      },
      items: {
        include: {
          barang: true,
          satuan: true,
          gudang_tujuan: true,
        },
      },
      diaktifkan_user: true,
      creator: true,
      updater: true,
    },
  });
};

const ALLOWED_STATUS = new Set(["draft", "aktif", "ditolak"]);

const findAll = async ({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
  sortBy = "created_at",
  sortOrder = "desc",
  status,
  projectId,
  area,
  warehouseId,
}) => {
  const sanitizedPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const sanitizedLimit = Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1);
  const orderField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "created_at";
  const orderDirection = ["asc", "desc"].includes((sortOrder || "").toLowerCase())
    ? sortOrder.toLowerCase()
    : "desc";

  const where = {};

  if (status && ALLOWED_STATUS.has(status.toLowerCase())) {
    where.status = status.toLowerCase();
  }

  if (projectId || area) {
    const tiketFilter = {};
    if (projectId) tiketFilter.project_id = Number(projectId);
    if (area) tiketFilter.area = { contains: area, mode: "insensitive" };
    where.tiket = tiketFilter;
  }

  if (warehouseId) {
    where.items = { some: { gudang_tujuan_id: Number(warehouseId) } };
  }

  if (search) {
    where.OR = [
      { tiket: { kode_tiket: { contains: search, mode: "insensitive" } } },
      { tiket: { area: { contains: search, mode: "insensitive" } } },
    ];
  }

  const total = await prisma.boq.count({
    where,
  });

  const data = await prisma.boq.findMany({
    where,
    orderBy: {
      [orderField]: orderDirection,
    },
    skip: (sanitizedPage - 1) * sanitizedLimit,
    take: sanitizedLimit,
    include: {
      tiket: {
        include: {
          project: true,
        },
      },
      items: {
        include: {
          barang: true,
          satuan: true,
          gudang_tujuan: true,
        },
      },
      diaktifkan_user: true,
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

const update = async (boq_id, data) => {
  const { items, ...boqData } = data;

  if (items) {
    await prisma.boq_item.deleteMany({
      where: { boq_id: Number(boq_id) },
    });

    const itemData = items.map((item) => ({
      ...item,
      boq_id: Number(boq_id),
    }));

    await prisma.boq_item.createMany({
      data: itemData,
    });
  }

  return await prisma.boq.update({
    where: { boq_id: Number(boq_id) },
    data: boqData,
    include: {
      tiket: {
        include: {
          project: true,
        },
      },
      items: {
        include: {
          barang: true,
          satuan: true,
          gudang_tujuan: true,
        },
      },
      diaktifkan_user: true,
    },
  });
};

const updateStatus = async (boq_id, status, userId) => {
  const updateData = { status };

  if (status === "aktif") {
    updateData.tanggal_aktivasi = new Date();
    updateData.diaktifkan_oleh = Number(userId);
  }

  return await prisma.boq.update({
    where: { boq_id: Number(boq_id) },
    data: updateData,
    include: {
      tiket: {
        include: {
          project: true,
        },
      },
      items: {
        include: {
          barang: true,
          satuan: true,
          gudang_tujuan: true,
        },
      },
      diaktifkan_user: true,
    },
  });
};

const softDelete = async (boq_id) => {
  return await prisma.boq.update({
    where: { boq_id: Number(boq_id) },
    data: { status: "ditolak" },
  });
};

const restore = async (boq_id) => {
  return await prisma.boq.update({
    where: { boq_id: Number(boq_id) },
    data: { status: "draft" },
  });
};

const getSummary = async (boq_id) => {
  const boq = await prisma.boq.findUnique({
    where: { boq_id: Number(boq_id) },
    include: {
      tiket: {
        include: {
          project: true,
        },
      },
      items: {
        include: {
          barang: true,
          satuan: true,
          gudang_tujuan: true,
        },
      },
      diaktifkan_user: true,
    },
  });

  if (!boq) {
    return null;
  }

  const totalQty = boq.items.reduce((sum, item) => sum + Number(item.qty_rencana || 0), 0);
  const warehouses = [...new Set(boq.items.map((item) => item.gudang_tujuan_id).filter(Boolean))];

  return {
    ...boq,
    summary: {
      totalItems: boq.items.length,
      totalQty,
      warehouseCount: warehouses.length,
      warehouses,
    },
  };
};

const exportBoqs = async ({ status, search, projectId, area, warehouseId }) => {
  const where = {};

  if (status) {
    where.status = status.toLowerCase();
  }

  if (projectId || area) {
    const tiketFilter = {};
    if (projectId) tiketFilter.project_id = Number(projectId);
    if (area) tiketFilter.area = { contains: area, mode: "insensitive" };
    where.tiket = tiketFilter;
  }

  if (warehouseId) {
    where.items = { some: { gudang_tujuan_id: Number(warehouseId) } };
  }

  if (search) {
    where.OR = [
      { tiket: { kode_tiket: { contains: search, mode: "insensitive" } } },
      { tiket: { area: { contains: search, mode: "insensitive" } } },
    ];
  }

  return await prisma.boq.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      tiket: {
        include: {
          project: true,
        },
      },
      items: {
        include: {
          barang: true,
          satuan: true,
          gudang_tujuan: true,
        },
      },
      diaktifkan_user: true,
    },
  });
};

const getStats = async () => {
  const [aktif, draft, total, activeTikets] = await Promise.all([
    prisma.boq.count({ where: { status: "aktif" } }),
    prisma.boq.count({ where: { status: "draft" } }),
    prisma.boq.count(),
    prisma.tiket_material.findMany({
      where: { boq: { status: "aktif" } },
      select: { project_id: true },
    }),
  ]);

  const uniqueProjectIds = new Set(activeTikets.map((t) => t.project_id));
  const proyekBerjalan = uniqueProjectIds.size;

  return {
    aktif,
    draft,
    total,
    proyekBerjalan,
  };
};

const getAreas = async () => {
  const areas = await prisma.tiket_material.findMany({
    select: { area: true },
    distinct: ["area"],
    orderBy: { area: "asc" },
  });

  return areas.map((row) => row.area).filter(Boolean);
};

const findItemsByProject = async (projectId) => {
  const boqs = await prisma.boq.findMany({
    where: {
      tiket: {
        project_id: Number(projectId),
      },
    },
    include: {
      items: {
        include: {
          barang: true,
          satuan: true,
        },
      },
    },
  });

  const itemMap = new Map();

  for (const boq of boqs) {
    for (const item of boq.items) {
      const barangId = item.barang_id;
      if (!barangId) continue;

      const existing = itemMap.get(barangId);
      if (existing) {
        existing.qty_rencana += Number(item.qty_rencana || 0);
        existing.boqCount += 1;
      } else {
        itemMap.set(barangId, {
          barang_id: String(barangId),
          kode_perangkat: item.barang?.kode_perangkat || "",
          nama_barang: item.barang?.nama_barang || "",
          qty_rencana: Number(item.qty_rencana || 0),
          satuan_id: item.satuan_id ? String(item.satuan_id) : null,
          satuan_kode: item.satuan?.kode_satuan || "",
          boqCount: 1,
        });
      }
    }
  }

  return Array.from(itemMap.values());
};

module.exports = {
  create,
  findById,
  findAll,
  update,
  updateStatus,
  softDelete,
  restore,
  getSummary,
  exportBoqs,
  getStats,
  getAreas,
  findItemsByProject,
};
