const { PrismaClient } = require('@prisma/client');

// Usage: DATABASE_URL=postgresql://... node backend/scripts/mos-impact-report.js
// Defaults to local .env if DATABASE_URL not set

const prisma = new PrismaClient();

function oldIsMosEligibleInbound(sj) {
  if (!sj || sj.tipe !== "inbound") return false;
  const APPROVED_INBOUND_STATUSES = ["ready_putaway", "disetujui", "diterima_didistribusikan"];
  if (!APPROVED_INBOUND_STATUSES.includes(sj.status)) return false;
  if (!sj.project_id && !sj.cluster_id) return false;
  const asal = sj.gudang_asal_id;
  const tujuan = sj.gudang_tujuan_id;
  if (sj.tipe_pengirim === "internal" && asal && tujuan && asal !== tujuan) return false;
  return true;
}

function newIsMosEligibleInbound(sj) {
  if (!sj || sj.tipe !== "inbound") return false;
  const APPROVED_INBOUND_STATUSES = ["ready_putaway", "disetujui", "diterima_didistribusikan"];
  if (!APPROVED_INBOUND_STATUSES.includes(sj.status)) return false;
  if (!sj.project_id && !sj.cluster_id) return false;
  if (sj.tipe_pengirim !== "external") return false;
  return true;
}

async function main() {
  console.log('=== MOS IMPACT REPORT ===');
  console.log('Database:', process.env.DATABASE_URL ? 'ENV DATABASE_URL' : 'LOCAL .env');
  console.log('');

  // Fetch ALL approved inbound items
  const inboundItems = await prisma.surat_jalan_item.findMany({
    where: {
      surat_jalan: {
        tipe: 'inbound',
        status: { in: ['ready_putaway', 'disetujui', 'diterima_didistribusikan'] },
        project_id: { not: null }
      }
    },
    include: {
      barang: { select: { barang_id: true, nama_barang: true } },
      surat_jalan: { select: { tipe_pengirim: true, gudang_asal_id: true, project_id: true, cluster_id: true, status: true } }
    }
  });

  // Fetch ALL approved outbound items (non-gudang)
  const outboundItems = await prisma.surat_jalan_item.findMany({
    where: {
      surat_jalan: {
        tipe: 'outbound',
        status: { in: ['disetujui', 'diterima_didistribusikan'] },
        project_id: { not: null },
        tujuan_tipe: { not: 'gudang' }
      }
    },
    include: {
      barang: { select: { barang_id: true, nama_barang: true } },
      surat_jalan: { select: { project_id: true, cluster_id: true, tujuan_tipe: true } }
    }
  });

  console.log(`Total inbound items (approved): ${inboundItems.length}`);
  console.log(`Total outbound items (approved, non-gudang): ${outboundItems.length}`);
  console.log('');

  // Build project-level maps
  const projectInboundOld = new Map();
  const projectOutboundOld = new Map();
  const projectInboundNew = new Map();

  // Build cluster-level maps
  const clusterInboundOld = new Map();
  const clusterOutboundOld = new Map();
  const clusterInboundNew = new Map();

  // Process inbound items
  for (const item of inboundItems) {
    const qty = Number(item.qty || 0);
    const pid = item.surat_jalan.project_id;
    const cid = item.surat_jalan.cluster_id;
    const bid = item.barang_id;
    const pKey = `${pid}-${bid}`;
    const cKey = cid ? `${cid}-${bid}` : null;

    // OLD: eligible if approved status + project/cluster + not internal transfer
    if (oldIsMosEligibleInbound(item.surat_jalan)) {
      projectInboundOld.set(pKey, (projectInboundOld.get(pKey) || 0) + qty);
      if (cKey) clusterInboundOld.set(cKey, (clusterInboundOld.get(cKey) || 0) + qty);
    }
    // NEW: eligible only if external
    if (newIsMosEligibleInbound(item.surat_jalan)) {
      projectInboundNew.set(pKey, (projectInboundNew.get(pKey) || 0) + qty);
      if (cKey) clusterInboundNew.set(cKey, (clusterInboundNew.get(cKey) || 0) + qty);
    }
  }

  // Process outbound items
  for (const item of outboundItems) {
    const qty = Number(item.qty || 0);
    const pid = item.surat_jalan.project_id;
    const cid = item.surat_jalan.cluster_id;
    const bid = item.barang_id;
    const pKey = `${pid}-${bid}`;
    const cKey = cid ? `${cid}-${bid}` : null;

    projectOutboundOld.set(pKey, (projectOutboundOld.get(pKey) || 0) + qty);
    if (cKey) clusterOutboundOld.set(cKey, (clusterOutboundOld.get(cKey) || 0) + qty);
  }

  // Calculate OLD MOS (max)
  const oldProjectMos = new Map();
  for (const key of new Set([...projectInboundOld.keys(), ...projectOutboundOld.keys()])) {
    oldProjectMos.set(key, Math.max(projectInboundOld.get(key) || 0, projectOutboundOld.get(key) || 0));
  }
  const oldClusterMos = new Map();
  for (const key of new Set([...clusterInboundOld.keys(), ...clusterOutboundOld.keys()])) {
    oldClusterMos.set(key, Math.max(clusterInboundOld.get(key) || 0, clusterOutboundOld.get(key) || 0));
  }

  // NEW MOS = inbound only (external)
  const newProjectMos = projectInboundNew;
  const newClusterMos = clusterInboundNew;

  // Pre-fetch barang names
  const barangIds = new Set();
  for (const key of new Set([...oldProjectMos.keys(), ...newProjectMos.keys(), ...oldClusterMos.keys(), ...newClusterMos.keys()])) {
    barangIds.add(key.split('-').pop());
  }
  const barangNames = new Map();
  for (const barangId of barangIds) {
    const barang = await prisma.barang.findUnique({ where: { barang_id: barangId }, select: { nama_barang: true } });
    if (barang) barangNames.set(barangId, barang.nama_barang);
  }

  // Pre-fetch project names
  const projectIds = new Set();
  for (const key of new Set([...oldProjectMos.keys(), ...newProjectMos.keys()])) {
    projectIds.add(key.split('-')[0]);
  }
  const projectNames = new Map();
  for (const pid of projectIds) {
    const project = await prisma.project.findUnique({ where: { project_id: BigInt(pid) }, select: { project_id: true, nama_project: true } });
    if (project) projectNames.set(pid, project.nama_project);
  }

  // Pre-fetch cluster names
  const clusterIds = new Set();
  for (const key of new Set([...oldClusterMos.keys(), ...newClusterMos.keys()])) {
    clusterIds.add(key.split('-')[0]);
  }
  const clusterNames = new Map();
  for (const cid of clusterIds) {
    const cluster = await prisma.cluster.findUnique({ where: { cluster_id: cid }, select: { cluster_id: true, nama_cluster: true, project_id: true } });
    if (cluster) clusterNames.set(cid, `${cluster.cluster_id} (${cluster.nama_cluster})`);
  }

  // Collect all results
  const results = [];

  // Project-level results
  for (const key of new Set([...oldProjectMos.keys(), ...newProjectMos.keys()])) {
    const [pid, bid] = key.split('-');
    const oldM = oldProjectMos.get(key) || 0;
    const newM = newProjectMos.get(key) || 0;
    const inbound = projectInboundNew.get(key) || 0;
    const outbound = projectOutboundOld.get(key) || 0;

    let boq = 0, additional = 0;
    try {
      const boqItems = await prisma.boq_item.findMany({
        where: { barang_id: bid, boq: { cluster: { project_id: BigInt(pid) } } },
        select: { qty_rencana: true }
      });
      boq = boqItems.reduce((sum, item) => sum + Number(item.qty_rencana || 0), 0);
      const additionalRepo = require('./src/modules/additional/additional.repository');
      const additionalMap = await additionalRepo.getAdditionalTotalsByProject([Number(pid)]);
      additional = additionalMap.get(Number(pid)) || 0;
    } catch (e) {}

    const oldRemains = Math.round((oldM - (boq + additional)) * 100) / 100;
    const newRemains = Math.round((newM - (boq + additional)) * 100) / 100;

    if (oldM !== newM || inbound > 0 || outbound > 0) {
      results.push({
        level: 'project',
        project: projectNames.get(pid) || `Project ${pid}`,
        cluster: '-',
        barang: barangNames.get(bid) || bid,
        inbound, outbound,
        mosOld: oldM, mosNew: newM, diff: newM - oldM,
        remainsOld: oldRemains, remainsNew: newRemains
      });
    }
  }

  // Cluster-level results
  for (const key of new Set([...oldClusterMos.keys(), ...newClusterMos.keys()])) {
    const [cid, bid] = [key.split('-')[0], key.split('-').pop()];
    const oldM = oldClusterMos.get(key) || 0;
    const newM = newClusterMos.get(key) || 0;
    const inbound = clusterInboundNew.get(key) || 0;
    const outbound = clusterOutboundOld.get(key) || 0;

    if (oldM !== newM || inbound > 0 || outbound > 0) {
      results.push({
        level: 'cluster',
        project: '-',
        cluster: clusterNames.get(cid) || cid,
        barang: barangNames.get(bid) || bid,
        inbound, outbound,
        mosOld: oldM, mosNew: newM, diff: newM - oldM,
        remainsOld: oldM, remainsNew: newM // no BOQ at cluster level
      });
    }
  }

  // Sort by absolute diff descending
  results.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  // Output CSV header
  console.log('level,project,cluster,barang,inbound,outbound,mos_old,mos_new,diff,remains_old,remains_new');
  
  // Output CSV rows
  for (const r of results) {
    console.log(`${r.level},${r.project},${r.cluster},"${r.barang}",${r.inbound},${r.outbound},${r.mosOld},${r.mosNew},${r.diff},${r.remainsOld},${r.remainsNew}`);
  }

  // Summary
  const total = results.length;
  const changed = results.filter(r => r.diff !== 0).length;
  const becameZero = results.filter(r => r.mosOld > 0 && r.mosNew === 0).length;

  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Total rows with data: ${total}`);
  console.log(`Rows with MOS change: ${changed}`);
  console.log(`Rows that became 0: ${becameZero}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });