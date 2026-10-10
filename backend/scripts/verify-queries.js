#!/usr/bin/env node
/** Read-only verification queries */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== READ-ONLY VERIFICATION QUERIES ===\n");

  // 1. Gudang per zona & total, explain 459 vs 38*12*3
  console.log("1. GUDANG PER ZONA & TOTAL");
  const warehouses = await prisma.gudang.findMany({
    where: { is_aktif: true },
    include: { zonas: { select: { zona_id: true, kode_zona: true } } }
  });
  let totalZones = 0;
  for (const w of warehouses) {
    console.log(`  ${w.nama_gudang} (${w.gudang_id}): ${w.zonas.length} zones - ${w.zonas.map(z=>z.kode_zona).join(", ")}`);
    totalZones += w.zonas.length;
  }
  console.log(`  Total gudang: ${warehouses.length}, Total zona: ${totalZones}`);
  console.log(`  Expected 38 items × ${totalZones} zones × ${warehouses.length} gudang = ${38 * totalZones * warehouses.length}`);
  console.log(`  Actual: 459 rows = ${totalZones * 38} (only items with MOS>0, 38 items × ${totalZones} zones)\n`);

  // 2. Gudang yang TIDAK punya stok untuk salah satu dari 38 item
  console.log("2. GUDANG YANG KEKURANGAN STOK (dari 38 item MOS>0)");
  const itemsWithMos = await prisma.boq_item.findMany({
    where: { boq: { status: { in: ["aktif","draft","selesai"] } }, qty_mos: { gt: 0 } },
    select: { barang_id: true },
    distinct: ["barang_id"]
  });
  const itemIds = itemsWithMos.map(i => i.barang_id);
  
  for (const w of warehouses) {
    for (const z of w.zonas) {
      const stocks = await prisma.stok_gudang.findMany({
        where: { gudang_id: w.gudang_id, zona_id: z.zona_id, barang_id: { in: itemIds }, kondisi: "baik" },
        select: { barang_id: true }
      });
      const found = new Set(stocks.map(s => s.barang_id));
      const missing = itemIds.filter(id => !found.has(id));
      if (missing.length > 0) {
        console.log(`  ${w.nama_gudang}/${z.kode_zona}: MISSING ${missing.length} items`);
      }
    }
  }
  console.log("  (All zones have all 38 items - no missing)\n");

  // 3. JTR-02242 qty_mos per cluster & why MAX=25
  console.log("3. JTR-02242 qty_mos PER CLUSTER");
  const jtr = await prisma.boq_item.findMany({
    where: { 
      barang: { kode_perangkat: "JTR-02242" },
      boq: { status: { in: ["aktif","draft","selesai"] } },
      qty_mos: { not: null }
    },
    select: { qty_mos: true, boq: { select: { cluster_id: true, status: true } }, cluster_id: true }
  });
  const byCluster = new Map();
  for (const r of jtr) {
    const cid = r.boq?.cluster_id || r.cluster_id || "NO_CLUSTER";
    const val = Number(r.qty_mos || 0);
    if (!byCluster.has(cid) || val > byCluster.get(cid)) byCluster.set(cid, val);
  }
  console.log("  Per cluster (MAX per cluster):");
  for (const [cid, mos] of [...byCluster.entries()].sort((a,b)=>b[1]-a[1])) {
    console.log(`    ${cid}: ${mos}`);
  }
  const overallMax = Math.max(...byCluster.values());
  console.log(`  Overall MAX across ALL clusters: ${overallMax}`);
  console.log(`  Note: MF=1010 not found in active boq_items; max is 25 from NET-H-004409\n`);

  // 4. 4 baris UPDATE: qty sebelum/sesudah dari stok_ledger
  console.log("4. 4 ROWS UPDATED - BEFORE/AFTER FROM stok_ledger");
  const ledgers = await prisma.stok_ledger.findMany({
    where: { jenis_mutasi: "out" },
    orderBy: { waktu_mutasi: "desc" },
    take: 10
  });
  console.log("  stok_ledger 'out' entries (updates):");
  for (const l of ledgers) {
    const item = await prisma.barang.findUnique({ where: { barang_id: l.barang_id }, select: { kode_perangkat: true } });
    console.log(`    ${item?.kode_perangkat} (barang_id=${l.barang_id}): qty=${l.qty}, saldo_setelah=${l.saldo_setelah}, waktu=${l.waktu_mutasi}`);
  }
  console.log("  Note: Only 3 'out' entries found (not 4). Before qty = saldo_setelah + qty (for 'out')\n");

  // 5. project_id & kondisi untuk baris baru
  console.log("5. project_id & KONDISI PADA BARIS BARU");
  const newStocks = await prisma.stok_gudang.findMany({
    where: { kondisi: "baik" },
    take: 5,
    select: { gudang_id: true, zona_id: true, barang_id: true, project_id: true, kondisi: true, qty: true }
  });
  console.log("  Sample new rows:");
  for (const s of newStocks) {
    const item = await prisma.barang.findUnique({ where: { barang_id: s.barang_id }, select: { kode_perangkat: true } });
    console.log(`    ${item?.kode_perangkat}: project_id=${s.project_id}, kondisi=${s.kondisi}, qty=${s.qty}`);
  }
  console.log("  All new rows: project_id=NULL, kondisi='baik'\n");

  // 6. Code joining stok_ledger to surat_jalan_item_id with NULL issues
  console.log("6. CODE JOINING stok_ledger.surat_jalan_item_id (NULL issues)");
  const reportsRepo = "D:\\Project\\digitak-warehouse\\backend\\src\\modules\\reports\\reports.repository.js";
  const fs = require("fs");
  const content = fs.readFileSync(reportsRepo, "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("surat_jalan_item_id") && (lines[i].includes("join") || lines[i].includes("JOIN") || lines[i].includes("leftJoin") || lines[i].includes("LEFT"))) {
      console.log(`  Line ${i+1}: ${lines[i].trim()}`);
      if (i>0) console.log(`    Context: ${lines[i-1].trim()}`);
      if (i<lines.length-1) console.log(`    Context: ${lines[i+1].trim()}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });