const prisma = require("../../config/prisma");

const safeCount = async (modelName, fallback = 0) => {
  const model = prisma[modelName];

  if (!model || typeof model.count !== "function") {
    return fallback;
  }

  return await model.count();
};

const getStats = async () => {
  const [totalItems, activeBoq, pendingShipments, pendingApprovals, activeProjects] =
    await Promise.all([
      safeCount("barang"),
      prisma.boq.count({ where: { status: "aktif" } }),
      prisma.surat_jalan.count({
        where: {
          status: {
            in: ["draft_diajukan", "disetujui", "digenerate"],
          },
        },
      }),
      prisma.approval_log.count({ where: { status: "menunggu" } }),
      prisma.project.count({ where: { status_aktif: true } }),
    ]);

  return {
    warehouses: await safeCount("gudang"),
    personnels: await safeCount("personil"),
    aisles: await safeCount("zona_gudang"),
    bins: await safeCount("bin_lokasi"),
    categories: await safeCount("kategori_barang"),
    customers: await safeCount("customer"),
    items: totalItems,
    totalItems,
    projects: activeProjects,
    activeBoq,
    pendingShipments,
    pendingApprovals,
    racks: await safeCount("rak"),
    suppliers: await safeCount("supplier"),
    units: await safeCount("satuan"),
    vehicles: await safeCount("kendaraan"),
    zones: await safeCount("zona_gudang"),
  };
};

const getProjectSummary = async () => {
  const projects = await prisma.project.findMany({
    where: {
      status_aktif: true,
    },
    orderBy: [{ area: "asc" }, { nama_project: "asc" }],
    select: {
      project_id: true,
      nama_project: true,
      title: true,
      cluster_id: true,
      area: true,
    },
  });

  const boqStatusByProject = new Map();

  const boqRecords = await prisma.boq.findMany({
    where: {
      status: { in: ["draft", "aktif"] },
    },
    include: {
      tiket: {
        select: {
          project_id: true,
        },
      },
    },
  });

  for (const boq of boqRecords) {
    const projectId = Number(boq.tiket?.project_id);
    if (!projectId) continue;

    if (boq.status === "aktif") {
      boqStatusByProject.set(projectId, "Aktif");
      continue;
    }

    if (!boqStatusByProject.has(projectId)) {
      boqStatusByProject.set(projectId, "Draft");
    }
  }

  const shipmentTotals = await prisma.surat_jalan.findMany({
    where: {
      status: "diterima_didistribusikan",
    },
    select: {
      tipe: true,
      project_id: true,
      items: {
        select: {
          qty: true,
        },
      },
    },
  });

  const hardwareOnSiteByProject = new Map();
  const usedByProject = new Map();

  for (const shipment of shipmentTotals) {
    const projectId = Number(shipment.project_id);
    if (!projectId) continue;

    const totalQty = shipment.items.reduce(
      (sum, item) => sum + Number(item.qty || 0),
      0
    );

    if (shipment.tipe === "inbound") {
      hardwareOnSiteByProject.set(
        projectId,
        (hardwareOnSiteByProject.get(projectId) || 0) + totalQty
      );
    }

    if (shipment.tipe === "outbound") {
      usedByProject.set(
        projectId,
        (usedByProject.get(projectId) || 0) + totalQty
      );
    }
  }

  return projects.map((project) => {
    const projectId = Number(project.project_id);
    const projectName = project.title || project.nama_project || "Project";
    const statusBoq = boqStatusByProject.get(projectId) || "Belum Ada";
    const hardwareOnSite = Number(hardwareOnSiteByProject.get(projectId) || 0);
    const used = Number(usedByProject.get(projectId) || 0);
    const remains = hardwareOnSite - used;
    const progress = hardwareOnSite > 0 ? Math.min(Math.round((used / hardwareOnSite) * 100), 100) : 0;

    return {
      projectId,
      projectName,
      clusterId: project.cluster_id || null,
      clusterLabel: project.cluster_id ? `RW ${project.cluster_id}` : "-",
      area: project.area || "-",
      statusBoq,
      hardwareOnSite,
      used,
      remains,
      progress,
    };
  });
};

module.exports = {
  getStats,
  getProjectSummary,
};
