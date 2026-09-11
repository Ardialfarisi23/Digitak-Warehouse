const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const ALLOWED_SORT_FIELDS = ["boq_id", "status", "tanggal_aktivasi", "created_at", "updated_at"];

const create = async (data) => {
  // 1. Cek dulu apakah tiket_id yang dikirim dari form sudah punya BOQ
  const existingBoq = await prisma.boq.findUnique({
    where: { tiket_id: Number(data.tiket_id) },
  });

  // 2. Kalau datanya ketemu (berarti sudah ada BOQ-nya), lemparkan error
  if (existingBoq) {
    throw new Error("Gagal menyimpan: Nomor tiket tersebut sudah memiliki BOQ aktif.");
  }

  // 3. Kalau aman, lanjutkan simpan
  return await prisma.boq.create({
    data,
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
      surat_jalans: {
        include: {
          items: true,
        },
      },
      diaktifkan_user: true,
      creator: true,
      updater: true,
    },
  });
};

const ALLOWED_STATUS = new Set(["draft", "aktif", "selesai", "ditolak"]);

const findAll = async ({ page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, search, sortBy = "created_at", sortOrder = "desc", status, projectId, area }) => {
  const sanitizedPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const sanitizedLimit = Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1);
  const orderField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "created_at";
  const orderDirection = ["asc", "desc"].includes((sortOrder || "").toLowerCase()) ? sortOrder.toLowerCase() : "desc";

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

  if (search) {
    where.OR = [{ tiket: { kode_tiket: { contains: search, mode: "insensitive" } } }, { tiket: { area: { contains: search, mode: "insensitive" } } }];
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

const exportBoqs = async ({ status, search, projectId, area }) => {
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

  if (search) {
    where.OR = [{ tiket: { kode_tiket: { contains: search, mode: "insensitive" } } }, { tiket: { area: { contains: search, mode: "insensitive" } } }];
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
  const [aktif, draft, selesai, total, activeTikets] = await Promise.all([
    prisma.boq.count({ where: { status: "aktif" } }),
    prisma.boq.count({ where: { status: "draft" } }),
    prisma.boq.count({ where: { status: "selesai" } }),
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
    selesai,
    total,
    proyekBerjalan,
  };
};

const getAreas = async () => {
  const areas = await prisma.project.findMany({
    select: { area: true },
    distinct: ["area"],
    orderBy: { area: "asc" },
  });

  return areas.map((row) => row.area).filter(Boolean);
};

const findItemsByProject = async (projectId) => {
  const boqs = await prisma.boq.findMany({
    where: {
      status: "aktif",
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

const getExportMatrixData = async () => {
  const boqItems = await prisma.boq_item.findMany({
    where: {
      boq: {
        status: "aktif",
      },
    },
    include: {
      boq: {
        include: {
          tiket: {
            select: {
              tiket_id: true,
              kode_tiket: true,
              mos: true,
              project: {
                select: {
                  project_id: true,
                  nama_project: true,
                  cluster_id: true,
                  area: true,
                },
              },
            },
          },
        },
      },
      barang: {
        select: {
          kode_perangkat: true,
          nama_barang: true,
        },
      },
      satuan: {
        select: {
          kode_satuan: true,
        },
      },
    },
  });

  const shipmentWhere = {
    surat_jalan: {
      status: { in: ["disetujui", "diterima_didistribusikan"] },
    },
  };

  const shipmentItems = await prisma.surat_jalan_item.findMany({
    where: shipmentWhere,
    include: {
      surat_jalan: {
        select: {
          tipe: true,
          project_id: true,
          boq_id: true,
          tujuan_tipe: true,
        },
      },
    },
  });

  const inboundByProjectBarang = new Map();
  const outboundByProjectBarang = new Map();
  const additionalByProjectBarang = new Map();

  for (const item of shipmentItems) {
    const projectIdNum = Number(item.surat_jalan?.project_id);
    const barangId = String(item.barang_id);
    const qty = Number(item.qty || 0);
    const key = `${projectIdNum}-${barangId}`;

    if (item.surat_jalan?.tipe === "inbound") {
      if (item.is_kelebihan) {
        additionalByProjectBarang.set(
          key,
          (additionalByProjectBarang.get(key) || 0) + qty
        );
      } else {
        inboundByProjectBarang.set(
          key,
          (inboundByProjectBarang.get(key) || 0) + qty
        );
      }
    }

    if (item.surat_jalan?.tipe === "outbound" && item.surat_jalan?.tujuan_tipe !== "gudang") {
      outboundByProjectBarang.set(
        key,
        (outboundByProjectBarang.get(key) || 0) + qty
      );
    }
  }

  const rows = boqItems.map((item) => {
    const tiket = item.boq?.tiket;
    const project = tiket?.project;
    const projectIdNum = Number(project?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;

    const boq = Number(item.qty_rencana || 0);
    const additional = Number(additionalByProjectBarang.get(key) || 0);
    const mosSistem = Number(inboundByProjectBarang.get(key) || 0);
    const mosMitra = Number(tiket?.mos || 0);
    const used = Number(outboundByProjectBarang.get(key) || 0);
    const remains = mosSistem - (boq + additional);

    return {
      project_id: projectIdNum,
      project_nama: project?.nama_project || "-",
      cluster_id: project?.cluster_id || "-",
      area: project?.area || "-",
      barang_id: barangId,
      kode_perangkat: item.barang?.kode_perangkat || "-",
      nama_barang: item.barang?.nama_barang || "-",
      satuan: item.satuan?.kode_satuan || "-",
      boq,
      additional,
      mos_sistem: mosSistem,
      mos_mitra: mosMitra,
      used,
      remains,
    };
  });

  const projectMap = new Map();
  const materialMap = new Map();

  for (const row of rows) {
    const projectKey = String(row.project_id);
    if (!projectMap.has(projectKey)) {
      projectMap.set(projectKey, {
        project_id: row.project_id,
        project_nama: row.project_nama,
        cluster_id: row.cluster_id,
        area: row.area,
      });
    }

    const materialKey = row.kode_perangkat;
    if (!materialMap.has(materialKey)) {
      materialMap.set(materialKey, {
        kode_perangkat: row.kode_perangkat,
        nama_barang: row.nama_barang,
        satuan: row.satuan,
        projects: {},
      });
    }

    const material = materialMap.get(materialKey);
    if (!material.projects[projectKey]) {
      material.projects[projectKey] = {
        project_id: row.project_id,
        project_nama: row.project_nama,
        boq: 0,
        additional: 0,
        mos_sistem: 0,
        mos_mitra: row.mos_mitra,
        used: 0,
        remains: 0,
      };
    }

    const proj = material.projects[projectKey];
    proj.boq += row.boq;
    proj.additional += row.additional;
    proj.mos_sistem += row.mos_sistem;
    proj.mos_mitra = Math.max(proj.mos_mitra, row.mos_mitra);
    proj.used += row.used;
    proj.remains = proj.mos_sistem - (proj.boq + proj.additional);
  }

  const usedProjectIds = new Set();

  for (const material of materialMap.values()) {
    const filteredProjects = {};
    for (const [key, proj] of Object.entries(material.projects)) {
      if (proj.boq > 0 || proj.additional > 0 || proj.mos_sistem > 0 || proj.used > 0) {
        filteredProjects[key] = proj;
        usedProjectIds.add(key);
      }
    }
    material.projects = filteredProjects;
  }

  for (const [key] of projectMap.entries()) {
    if (!usedProjectIds.has(key)) {
      projectMap.delete(key);
    }
  }

  const projects = Array.from(projectMap.values()).sort((a, b) =>
    a.project_nama.localeCompare(b.project_nama)
  );
  const materials = Array.from(materialMap.values()).sort((a, b) =>
    a.kode_perangkat.localeCompare(b.kode_perangkat)
  );

  return {
    projects,
    materials,
  };
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
  getExportMatrixData,
};
