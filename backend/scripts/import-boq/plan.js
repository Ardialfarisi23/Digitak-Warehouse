// backend/scripts/import-boq/plan.js
// Bandingkan parse result dengan DB, rencanakan import

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserExists(userId) {
  const user = await prisma.user_account.findUnique({
    where: { user_id: BigInt(userId) },
    select: { user_id: true, nama: true, role: true },
  });
  return user;
}

async function lookupBarang(kodePerangkat) {
  return prisma.barang.findUnique({
    where: { kode_perangkat: kodePerangkat },
    select: { barang_id: true, kode_perangkat: true, nama_barang: true, satuan_default_id: true },
  });
}

async function checkProjectExists(namaProject) {
  if (!namaProject || !namaProject.trim()) return null;
  return prisma.project.findFirst({
    where: { nama_project: { equals: namaProject.trim(), mode: 'insensitive' } },
    select: { project_id: true, nama_project: true },
  });
}

async function checkClusterExists(clusterId) {
  return prisma.cluster.findUnique({
    where: { cluster_id: clusterId },
    select: { cluster_id: true, nama_cluster: true, project_id: true },
  });
}

async function checkBoqExists(clusterId) {
  return prisma.boq.findFirst({
    where: { cluster_id: clusterId, status: { in: ['draft', 'aktif'] } },
    select: { boq_id: true, cluster_id: true, status: true, tiket_id: true },
  });
}

async function checkBoqItemExists(boqId, barangId) {
  return prisma.boq_item.findFirst({
    where: { boq_id: BigInt(boqId), barang_id: BigInt(barangId) },
    select: { boq_item_id: true },
  });
}

async function getExistingCounts() {
  return prisma.$queryRaw`
    SELECT 
      (SELECT count(*) FROM project) as project_count,
      (SELECT count(*) FROM cluster) as cluster_count,
      (SELECT count(*) FROM tiket_material) as tiket_count,
      (SELECT count(*) FROM boq) as boq_count,
      (SELECT count(*) from boq_item) as boq_item_count
  `;
}

async function generatePlan(parsedData, userId) {
  const blockers = [...parsedData.blockers];
  const warnings = [...parsedData.warnings];
  const plan = {
    project: { action: 'create', reason: '', data: parsedData.project },
    clusters: [],
    summary: { create: 0, skip: 0, conflict: 0, blocker: 0 },
  };

  // Helper to get project name from nested data
  const getProjectName = () => plan.project.data?.nama_project || plan.project.nama_project;

  // 1. Cek user
  const user = await checkUserExists(userId);
  if (!user) {
    blockers.push(`User ID ${userId} tidak ditemukan di user_account`);
    plan.summary.blocker++;
  }
  plan.project.created_by = userId;
  plan.project.updated_by = userId;

  // 2. Validasi nama project tidak kosong
  const projectName = getProjectName();
  if (!projectName || !projectName.trim()) {
    blockers.push('Nama project kosong/undefined — tidak bisa melanjutkan');
    plan.summary.blocker++;
  }

  // 3. Cek project existing (case-insensitive, exact match)
  let existingProject = null;
  if (projectName && projectName.trim()) {
    existingProject = await checkProjectExists(projectName);
  }
  
  if (existingProject) {
    plan.project.action = 'skip';
    plan.project.reason = `Project "${projectName}" sudah ada (ID: ${existingProject.project_id})`;
    plan.project.existing_id = existingProject.project_id;
    plan.summary.conflict++;
  } else {
    plan.summary.create++;
  }

  // 4. Lookup semua barang sekaligus
  const allMaterialCodes = [...new Set(
    parsedData.clusters.flatMap(c => c.items.map(i => i.material_code)).filter(Boolean)
  )];

  const barangMap = new Map();
  for (const code of allMaterialCodes) {
    const barang = await lookupBarang(code);
    if (barang) {
      barangMap.set(code, barang);
    }
  }

  // Cek barang yang tidak cocok
  const missingCodes = allMaterialCodes.filter(c => !barangMap.has(c));
  if (missingCodes.length > 0) {
    blockers.push(`Material codes tidak ditemukan di DB (${missingCodes.length}/${allMaterialCodes.length}): ${missingCodes.join(', ')}`);
    plan.summary.blocker += missingCodes.length;
  }

  // 5. Proses tiap cluster
  let projectIdForClusters = existingProject ? Number(existingProject.project_id) : null;

  for (const cluster of parsedData.clusters) {
    const clusterPlan = {
      cluster_id: cluster.cluster_id,
      nama_cluster: cluster.nama_cluster,
      action: 'create',
      reason: '',
      items: [],
      totals: { boq_plan: 0, additional: 0, mos: 0, used: 0, remains: 0 },
    };

    // Validasi cluster_id tidak kosong
    if (!cluster.cluster_id || !cluster.cluster_id.trim()) {
      blockers.push(`Cluster index ${cluster.index}: cluster_id kosong`);
      plan.summary.blocker++;
      clusterPlan.action = 'blocker';
    }

    // Validasi nama_cluster tidak kosong
    if (!cluster.nama_cluster || !cluster.nama_cluster.trim()) {
      blockers.push(`Cluster ${cluster.cluster_id}: nama_cluster kosong`);
      plan.summary.blocker++;
      clusterPlan.action = 'blocker';
    }

    // Cek cluster existing
    const existingCluster = await checkClusterExists(cluster.cluster_id);
    if (existingCluster) {
      clusterPlan.action = 'skip';
      clusterPlan.reason = `Cluster ${cluster.cluster_id} sudah ada (project_id: ${existingCluster.project_id})`;
      clusterPlan.existing_id = existingCluster.cluster_id;
      plan.summary.conflict++;
    } else {
      clusterPlan.created_by = userId;
      clusterPlan.updated_by = userId;
      clusterPlan.homepass_plan = cluster.homepass_plan;
      clusterPlan.no_tiket_release = cluster.no_tiket_release;
      clusterPlan.status_aktif = true;
      plan.summary.create++;
    }

    // Proses items
    for (const item of cluster.items) {
      const barang = barangMap.get(item.material_code);
      if (!barang) {
        clusterPlan.items.push({ ...item, action: 'blocker', reason: 'Barang tidak ditemukan di DB' });
        continue;
      }

      // Cek baris semua kosong (sudah di-skip di parse)
      const hasAnyQty = item.boq_plan !== null || item.additional !== null || item.mos !== null || item.used !== null;
      if (!hasAnyQty) {
        clusterPlan.items.push({ ...item, action: 'skip', reason: 'Semua angka NULL' });
        continue;
      }

      // Warning: qty_rencana NULL tapi angka lain ada
      if (item.boq_plan === null && (item.additional !== null || item.mos !== null || item.used !== null)) {
        warnings.push(`Cluster ${cluster.cluster_id} row ${item.row}: BoQ Plan NULL tapi ada Additional/MOS/Used — qty_rencana diisi 0`);
      }

      const itemPlan = {
        ...item,
        barang_id: Number(barang.barang_id),
        satuan_id: Number(barang.satuan_default_id),
        action: 'create',
        reason: '',
      };

      clusterPlan.items.push(itemPlan);

      // Akumulasi totals
      clusterPlan.totals.boq_plan += item.boq_plan || 0;
      clusterPlan.totals.additional += item.additional || 0;
      clusterPlan.totals.mos += item.mos || 0;
      clusterPlan.totals.used += item.used || 0;
      clusterPlan.totals.remains += item.remains_calc || 0;
    }

    // Cek BOQ existing untuk cluster ini
    // Skip BOQ for NET-H-004410 (incomplete cluster)
    if (cluster.skip_boq) {
      clusterPlan.boq_action = 'skip';
      clusterPlan.boq_reason = 'Cluster NET-H-004410 incomplete (hanya BoQ Plan 1 kolom) — BOQ tidak dibuat';
    } else {
      const existingBoq = await checkBoqExists(cluster.cluster_id);
      if (existingBoq) {
        clusterPlan.boq_action = 'skip';
        clusterPlan.boq_reason = `BOQ aktif untuk cluster ${cluster.cluster_id} sudah ada (boq_id: ${existingBoq.boq_id})`;
        plan.summary.conflict++;
      } else {
        clusterPlan.boq_action = 'create';
      }
    }

    plan.clusters.push(clusterPlan);
  }

  // 6. Hitung existing counts
  const existingCounts = await getExistingCounts();
  plan.existing_counts = existingCounts[0];

  // 7. Estimasi counts setelah import
  const willCreateClusters = plan.clusters.filter(c => c.action === 'create').length;
  const willCreateBoqs = plan.clusters.filter(c => c.boq_action === 'create').length;
  const willCreateItems = plan.clusters.flatMap(c => c.items.filter(i => i.action === 'create')).length;

  plan.estimated_after = {
    project: Number(plan.existing_counts.project_count) + (plan.project.action === 'create' ? 1 : 0),
    cluster: Number(plan.existing_counts.cluster_count) + willCreateClusters,
    tiket: Number(plan.existing_counts.tiket_count),
    boq: Number(plan.existing_counts.boq_count) + willCreateBoqs,
    boq_item: Number(plan.existing_counts.boq_item_count) + willCreateItems,
  };

  return { plan, blockers, warnings };
}

module.exports = { generatePlan, checkUserExists, getExistingCounts };