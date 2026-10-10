const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");

const FINAL_SHIPMENT_STATUSES = ["disetujui", "diterima_didistribusikan"];

async function getAdjustmentTotals(projectIds) {
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.additional_adjustment.groupBy({
    by: ["barang_id"],
    where: {
      project_id: { in: projectIds.map((id) => BigInt(id)) },
    },
    _sum: {
      qty: true,
    },
  });

  const map = new Map();
  for (const row of rows) {
    map.set(String(row.barang_id), Number(row._sum.qty || 0));
  }
  return map;
}

async function getAdjustmentTotalsByProject(projectIds) {
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.additional_adjustment.groupBy({
    by: ["project_id", "barang_id"],
    where: {
      project_id: { in: projectIds.map((id) => BigInt(id)) },
    },
    _sum: {
      qty: true,
    },
  });

  const map = new Map();
  for (const row of rows) {
    const key = `${Number(row.project_id)}-${row.barang_id}`;
    map.set(key, Number(row._sum.qty || 0));
  }
  return map;
}

async function getAdjustmentTotalsByCluster(clusterIds) {
  if (!Array.isArray(clusterIds) || clusterIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.additional_adjustment.groupBy({
    by: ["cluster_id", "barang_id"],
    where: {
      cluster_id: { in: clusterIds },
    },
    _sum: {
      qty: true,
    },
  });

  const map = new Map();
  for (const row of rows) {
    const key = `${row.cluster_id}-${row.barang_id}`;
    map.set(key, Number(row._sum.qty || 0));
  }
  return map;
}

async function getKelebihanTotals(projectIds) {
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return new Map();
  }

  const items = await prisma.surat_jalan_item.findMany({
    where: {
      is_kelebihan: true,
      surat_jalan: {
        tipe: "inbound",
        status: { in: FINAL_SHIPMENT_STATUSES },
        project_id: { in: projectIds.map((id) => BigInt(id)) },
      },
    },
    select: {
      barang_id: true,
      qty: true,
    },
  });

  const map = new Map();
  for (const item of items) {
    const key = String(item.barang_id);
    map.set(key, (map.get(key) || 0) + Number(item.qty || 0));
  }
  return map;
}

async function getKelebihanTotalsByProject(projectIds) {
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return new Map();
  }

  const items = await prisma.surat_jalan_item.findMany({
    where: {
      is_kelebihan: true,
      surat_jalan: {
        tipe: "inbound",
        status: { in: FINAL_SHIPMENT_STATUSES },
        project_id: { in: projectIds.map((id) => BigInt(id)) },
      },
    },
    select: {
      barang_id: true,
      qty: true,
      surat_jalan: {
        select: {
          project_id: true,
        },
      },
    },
  });

  const map = new Map();
  for (const item of items) {
    const key = `${Number(item.surat_jalan.project_id)}-${item.barang_id}`;
    map.set(key, (map.get(key) || 0) + Number(item.qty || 0));
  }
  return map;
}

async function getKelebihanTotalsByCluster(clusterIds) {
  if (!Array.isArray(clusterIds) || clusterIds.length === 0) {
    return new Map();
  }

  const items = await prisma.surat_jalan_item.findMany({
    where: {
      is_kelebihan: true,
      surat_jalan: {
        tipe: "inbound",
        status: { in: FINAL_SHIPMENT_STATUSES },
        cluster_id: { in: clusterIds },
      },
    },
    select: {
      barang_id: true,
      qty: true,
      surat_jalan: {
        select: {
          cluster_id: true,
        },
      },
    },
  });

  const map = new Map();
  for (const item of items) {
    if (!item.surat_jalan?.cluster_id) continue;
    const key = `${item.surat_jalan.cluster_id}-${item.barang_id}`;
    map.set(key, (map.get(key) || 0) + Number(item.qty || 0));
  }
  return map;
}

async function getAdditionalTotals(projectIds) {
  const [kelebihanMap, adjustmentMap] = await Promise.all([
    getKelebihanTotals(projectIds),
    getAdjustmentTotals(projectIds),
  ]);

  const result = new Map();
  for (const [key, val] of kelebihanMap) {
    result.set(key, val);
  }
  for (const [key, val] of adjustmentMap) {
    result.set(key, (result.get(key) || 0) + val);
  }
  return result;
}

async function getAdditionalTotalsByProject(projectIds) {
  const [kelebihanMap, adjustmentMap] = await Promise.all([
    getKelebihanTotalsByProject(projectIds),
    getAdjustmentTotalsByProject(projectIds),
  ]);

  const result = new Map();
  for (const [key, val] of kelebihanMap) {
    result.set(key, val);
  }
  for (const [key, val] of adjustmentMap) {
    result.set(key, (result.get(key) || 0) + val);
  }
  return result;
}

async function getAdditionalTotalsByCluster(clusterIds) {
  const [kelebihanMap, adjustmentMap] = await Promise.all([
    getKelebihanTotalsByCluster(clusterIds),
    getAdjustmentTotalsByCluster(clusterIds),
  ]);

  const result = new Map();
  for (const [key, val] of kelebihanMap) {
    result.set(key, val);
  }
  for (const [key, val] of adjustmentMap) {
    result.set(key, (result.get(key) || 0) + val);
  }
  return result;
}

async function getAdditionalTotalsByProjectOnly(projectIds) {
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return new Map();
  }

  const adjustmentRows = await prisma.additional_adjustment.groupBy({
    by: ["project_id"],
    where: {
      project_id: { in: projectIds.map((id) => BigInt(id)) },
    },
    _sum: {
      qty: true,
    },
  });

  const kelebihanMap = new Map();
  const items = await prisma.surat_jalan_item.findMany({
    where: {
      is_kelebihan: true,
      surat_jalan: {
        tipe: "inbound",
        status: { in: FINAL_SHIPMENT_STATUSES },
        project_id: { in: projectIds.map((id) => BigInt(id)) },
      },
    },
    select: {
      qty: true,
      surat_jalan: {
        select: {
          project_id: true,
        },
      },
    },
  });

  for (const item of items) {
    const pid = Number(item.surat_jalan.project_id);
    kelebihanMap.set(pid, (kelebihanMap.get(pid) || 0) + Number(item.qty || 0));
  }

  const result = new Map();
  for (const row of adjustmentRows) {
    const pid = Number(row.project_id);
    result.set(pid, Number(row._sum.qty || 0));
  }
  for (const [pid, val] of kelebihanMap) {
    result.set(pid, (result.get(pid) || 0) + val);
  }
  return result;
}

async function createAdjustment(tx, { projectId, clusterId, barangId, qty, alasan, userId }) {
  const [existingAdjustments, existingKelebihan] = await Promise.all([
    tx.additional_adjustment.findMany({
      where: {
        project_id: BigInt(projectId),
        cluster_id: clusterId || null,
        barang_id: BigInt(barangId),
      },
      select: { qty: true },
    }),
    tx.surat_jalan_item.findMany({
      where: {
        barang_id: BigInt(barangId),
        is_kelebihan: true,
        surat_jalan: {
          tipe: "inbound",
          status: { in: FINAL_SHIPMENT_STATUSES },
          project_id: BigInt(projectId),
          cluster_id: clusterId || null,
        },
      },
      select: { qty: true },
    }),
  ]);

  const adjustmentTotal = existingAdjustments.reduce(
    (sum, a) => sum + Number(a.qty || 0),
    0
  );
  const kelebihanTotal = existingKelebihan.reduce(
    (sum, item) => sum + Number(item.qty || 0),
    0
  );
  const currentTotal = adjustmentTotal + kelebihanTotal;

  if (currentTotal + qty < 0) {
    throw new AppError(
      "Total additional tidak boleh negatif. Nilai saat ini: " +
        currentTotal +
        ", penyesuaian: " +
        qty,
      400
    );
  }

  return tx.additional_adjustment.create({
    data: {
      project_id: BigInt(projectId),
      cluster_id: clusterId || null,
      barang_id: BigInt(barangId),
      qty: Math.trunc(qty),
      alasan: alasan.trim(),
      created_by: BigInt(userId),
    },
  });
}

async function listAdjustments(projectId, barangId, clusterId) {
  const where = {
    project_id: BigInt(projectId),
    barang_id: BigInt(barangId),
  };
  if (clusterId) {
    where.cluster_id = clusterId;
  }
  return prisma.additional_adjustment.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      creator: {
        select: {
          user_id: true,
          nama: true,
        },
      },
    },
  });
}

module.exports = {
  getAdjustmentTotals,
  getAdjustmentTotalsByProject,
  getAdjustmentTotalsByCluster,
  getKelebihanTotals,
  getKelebihanTotalsByProject,
  getKelebihanTotalsByCluster,
  getAdditionalTotals,
  getAdditionalTotalsByProject,
  getAdditionalTotalsByCluster,
  getAdditionalTotalsByProjectOnly,
  createAdjustment,
  listAdjustments,
};
