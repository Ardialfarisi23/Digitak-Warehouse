require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function analyze() {
  console.log("=== FASE 1: LOCATE & ANALISIS ===\n");

  // 1. Count items, clusters, zones, warehouses
  const totalItems = await prisma.barang.count({ where: {} });
  const totalClusters = await prisma.cluster.count({ where: { status_aktif: true } });
  const totalZones = await prisma.zona_gudang.count({ where: {} });
  const totalWarehouses = await prisma.gudang.count({ where: { is_aktif: true } });
  const totalProjects = await prisma.project.count({ where: { status_aktif: true } });

  console.log(`Items (barang): ${totalItems}`);
  console.log(`Clusters (active): ${totalClusters}`);
  console.log(`Zones (zona_gudang): ${totalZones}`);
  console.log(`Warehouses (gudang, active): ${totalWarehouses}`);
  console.log(`Projects (active): ${totalProjects}\n`);

  // 2. Check MOS per item per cluster from boq_item
  console.log("--- MOS per item per cluster (from boq_item) ---");
  const boqItems = await prisma.boq_item.findMany({
    where: {
      boq: { status: { in: ["aktif", "draft", "selesai"] } },
      qty_mos: { not: null }
    },
    include: {
      boq: { include: { cluster: true, tiket: true } },
      barang: { select: { barang_id: true, kode_perangkat: true, nama_barang: true } }
    }
  });

  const mosByItemCluster = new Map();
  for (const bi of boqItems) {
    const clusterId = bi.boq?.cluster?.cluster_id || bi.cluster_id || "NO_CLUSTER";
    const barangId = String(bi.barang_id);
    const key = `${clusterId}-${barangId}`;
    const existing = mosByItemCluster.get(key) || { mos: 0, clusters: new Set(), items: [] };
    existing.mos += Number(bi.qty_mos || 0);
    existing.clusters.add(clusterId);
    existing.items.push({
      boq_item_id: bi.boq_item_id,
      cluster_id: clusterId,
      barang_id: barangId,
      kode_perangkat: bi.barang?.kode_perangkat,
      nama_barang: bi.barang?.nama_barang,
      qty_mos: Number(bi.qty_mos || 0),
      boq_status: bi.boq?.status
    });
    mosByItemCluster.set(key, existing);
  }

  console.log(`Total boq_item rows with MOS: ${boqItems.length}`);
  console.log(`Unique item-cluster combinations: ${mosByItemCluster.size}\n`);

  // 3. Check for items with different MOS across clusters
  console.log("--- Items with MOS differing across clusters ---");
  const mosByItem = new Map();
  for (const [key, val] of mosByItemCluster.entries()) {
    const [clusterId, barangId] = key.split("-");
    if (!mosByItem.has(barangId)) {
      mosByItem.set(barangId, { clusters: new Map(), items: val.items });
    }
    const itemData = mosByItem.get(barangId);
    itemData.clusters.set(clusterId, val.mos);
  }

  let conflictCount = 0;
  for (const [barangId, data] of mosByItem.entries()) {
    const mosValues = [...data.clusters.values()];
    const uniqueMos = [...new Set(mosValues)];
    if (uniqueMos.length > 1) {
      conflictCount++;
      const itemInfo = data.items[0];
      console.log(`  CONFLICT: ${itemInfo.kode_perangkat} (${itemInfo.nama_barang}) - MOS per cluster:`);
      for (const [cid, mos] of data.clusters.entries()) {
        console.log(`    Cluster ${cid}: ${mos}`);
      }
    }
  }
  if (conflictCount === 0) {
    console.log("  No conflicts found (all items have same MOS across clusters)\n");
  } else {
    console.log(`  Total conflicts: ${conflictCount}\n`);
  }

  // 4. Check items with no MOS or MOS = 0
  console.log("--- Items with no MOS or MOS = 0 ---");
  const allItems = await prisma.barang.findMany({
    select: { barang_id: true, kode_perangkat: true, nama_barang: true }
  });
  const itemsWithMos = new Set([...mosByItem.keys()]);
  let noMosCount = 0;
  for (const item of allItems) {
    if (!itemsWithMos.has(String(item.barang_id))) {
      noMosCount++;
      if (noMosCount <= 10) {
        console.log(`  NO MOS: ${item.kode_perangkat} (${item.nama_barang})`);
      }
    } else {
      const data = mosByItem.get(String(item.barang_id));
      const totalMos = [...data.clusters.values()].reduce((a, b) => a + b, 0);
      if (totalMos === 0) {
        noMosCount++;
        if (noMosCount <= 10) {
          console.log(`  MOS=0: ${item.kode_perangkat} (${item.nama_barang})`);
        }
      }
    }
  }
  if (noMosCount > 10) console.log(`  ... and ${noMosCount - 10} more`);
  console.log(`  Total items with no MOS or MOS=0: ${noMosCount}\n`);

  // 5. Check existing stock in stok_gudang
  console.log("--- Existing stock in stok_gudang ---");
  const existingStock = await prisma.stok_gudang.groupBy({
    by: ["gudang_id", "barang_id"],
    _sum: { qty: true },
    _count: { _all: true }
  });
  console.log(`Total stock rows (grouped by gudang+barang): ${existingStock.length}`);
  console.log(`Sample (first 5):`);
  existingStock.slice(0, 5).forEach(s => console.log(`  Gudang ${s.gudang_id}, Item ${s.barang_id}: ${s._sum.qty} (${s._count._all} rows)`));
  console.log("");

  // 6. Check unique constraint on stok_gudang
  console.log("--- stok_gudang unique constraint ---");
  console.log("  @@unique([gudang_id, zona_id, barang_id, project_id, kondisi])");
  console.log("  This means: one row per warehouse+zone+item+project+condition\n");

  // 7. Show sample MOS values
  console.log("--- Sample MOS values (first 10 item-cluster combos) ---");
  let i = 0;
  for (const [key, val] of mosByItemCluster.entries()) {
    if (i >= 10) break;
    const item = val.items[0];
    console.log(`  ${item.kode_perangkat} (${item.nama_barang}) | Cluster: ${key.split("-")[0]} | MOS: ${val.mos}`);
    i++;
  }
  console.log("");

  // 8. Check zones per warehouse
  console.log("--- Zones per warehouse (sample) ---");
  const warehousesWithZones = await prisma.gudang.findMany({
    where: { is_aktif: true },
    take: 5,
    include: { zonas: { select: { zona_id: true, kode_zona: true, nama_zona: true } } }
  });
  for (const w of warehousesWithZones) {
    console.log(`  Gudang: ${w.nama_gudang} (${w.gudang_id}) - ${w.zonas.length} zones`);
    w.zonas.slice(0, 3).forEach(z => console.log(`    Zone: ${z.kode_zona} (${z.nama_zona || "-"})`));
    if (w.zonas.length > 3) console.log(`    ... and ${w.zonas.length - 3} more`);
  }
  console.log("");

  // 9. Check if stok_ledger is used for audit trail
  console.log("--- stok_ledger usage ---");
  const ledgerCount = await prisma.stok_ledger.count();
  const ledgerTypes = await prisma.stok_ledger.groupBy({
    by: ["jenis_mutasi"],
    _count: { _all: true }
  });
  console.log(`Total ledger entries: ${ledgerCount}`);
  ledgerTypes.forEach(t => console.log(`  ${t.jenis_mutasi}: ${t._count._all}`));
  console.log("");

  await prisma.$disconnect();
}

analyze().catch(e => { console.error(e); process.exit(1); });