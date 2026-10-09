// backend/scripts/import-boq/verify.js
// Verifikasi hasil import (SELECT only)

const { PrismaClient } = require('@prisma/client');
const config = require('./config');
const { parseExcel } = require('./parse-excel');

const prisma = new PrismaClient();

async function verifyImport(parsedData, userId) {
  const results = {
    match: true,
    clusters: [],
    summary: { project: 0, cluster: 0, boq: 0, boq_item: 0 },
    orphan: { cluster_no_project: [], boq_no_cluster: [], boq_item_no_boq: [], boq_item_no_barang: [] },
    discrepancies: [],
  };

  // 1. Cek project
  const project = await prisma.project.findFirst({
    where: { nama_project: parsedData.project.nama_project },
    select: { project_id: true, nama_project: true, created_by: true },
  });
  if (!project) {
    results.match = false;
    results.discrepancies.push('Project tidak ditemukan');
  } else {
    results.summary.project = 1;
  }

  // 2. Cek tiap cluster
  for (const c of parsedData.clusters) {
    const cluster = await prisma.cluster.findUnique({
      where: { cluster_id: c.cluster_id },
      select: { cluster_id: true, project_id: true, nama_cluster: true, homepass_plan: true, no_tiket_release: true },
    });

    const clusterResult = {
      cluster_id: c.cluster_id,
      exists: !!cluster,
      items_expected: c.items.filter(i => i.boq_plan !== null || i.additional !== null || i.mos !== null || i.used !== null).length,
      items_actual: 0,
      totals: { boq_plan: 0, additional: 0, mos: 0, used: 0, remains: 0 },
    };

    if (!cluster) {
      results.match = false;
      results.discrepancies.push(`Cluster ${c.cluster_id} tidak ditemukan`);
      results.clusters.push(clusterResult);
      continue;
    }

    results.summary.cluster++;
    if (cluster.project_id !== project?.project_id) {
      results.orphan.cluster_no_project.push(c.cluster_id);
    }

    // 3. Cek BOQ
    const boq = await prisma.boq.findFirst({
      where: { cluster_id: c.cluster_id },
      select: { boq_id: true, boq_number: true, status: true, tiket_id: true },
    });

    if (!boq) {
      results.match = false;
      results.discrepancies.push(`BOQ untuk cluster ${c.cluster_id} tidak ditemukan`);
      results.clusters.push(clusterResult);
      continue;
    }
    results.summary.boq++;

    if (boq.tiket_id !== null) {
      results.discrepancies.push(`BOQ ${boq.boq_number} memiliki tiket_id (seharusnya NULL)`);
    }

    // 4. Cek BOQ Items
    const items = await prisma.boq_item.findMany({
      where: { boq_id: boq.boq_id },
      select: {
        boq_item_id: true,
        barang_id: true,
        qty_rencana: true,
        qty_additional: true,
        qty_mos: true,
        qty_used: true,
        barang: { select: { kode_perangkat: true, nama_barang: true } },
      },
    });

    clusterResult.items_actual = items.length;
    results.summary.boq_item += items.length;

    // Bandingkan tiap item
    for (const item of c.items) {
      const dbItem = items.find(i => i.barang.kode_perangkat === item.material_code);
      if (!dbItem) {
        results.match = false;
        results.discrepancies.push(`Cluster ${c.cluster_id}: item ${item.material_code} tidak ditemukan di DB`);
        continue;
      }

      // Bandingkan angka
      const compare = (excel, db, label) => {
        const e = excel || 0;
        const d = Number(db) || 0;
        if (Math.abs(e - d) >= 0.01) {
          results.match = false;
          results.discrepancies.push(`Cluster ${c.cluster_id} ${item.material_code}: ${label} mismatch — Excel=${e}, DB=${d}`);
        }
        return { excel: e, db: d };
      };

      compare(item.boq_plan, dbItem.qty_rencana, 'qty_rencana/BoQ Plan');
      compare(item.additional, dbItem.qty_additional, 'qty_additional');
      compare(item.mos, dbItem.qty_mos, 'qty_mos');
      compare(item.used, dbItem.qty_used, 'qty_used');

      clusterResult.totals.boq_plan += item.boq_plan || 0;
      clusterResult.totals.additional += item.additional || 0;
      clusterResult.totals.mos += item.mos || 0;
      clusterResult.totals.used += item.used || 0;
      clusterResult.totals.remains += item.remains_calc || 0;
    }

    // Cek orphan boq_item
    for (const dbItem of items) {
      if (!dbItem.barang) {
        results.orphan.boq_item_no_barang.push({ boq_item_id: dbItem.boq_item_id, barang_id: dbItem.barang_id });
      }
    }

    results.clusters.push(clusterResult);
  }

  // 5. Hitung remains di sisi aplikasi
  for (const c of results.clusters) {
    const calcRemains = (c.totals.mos || 0) - (c.totals.additional || 0) - (c.totals.boq_plan || 0);
    c.remains_calc = calcRemains;
  }

  return results;
}

module.exports = { verifyImport };