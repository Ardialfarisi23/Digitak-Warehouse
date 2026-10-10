#!/usr/bin/env node
/**
 * Verify seed results
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function verify() {
  console.log("=== VERIFIKASI HASIL SEED ===\n");

  // 1. Count warehouses, zones, items
  const warehouses = await prisma.gudang.findMany({
    where: { is_aktif: true },
    select: { gudang_id: true, nama_gudang: true }
  });
  const totalWarehouses = warehouses.length;

  const zones = await prisma.zona_gudang.findMany({
    where: { gudang_id: { in: warehouses.map(w => w.gudang_id) } },
    select: { zona_id: true, gudang_id: true, kode_zona: true }
  });
  const totalZones = zones.length;

  const items = await prisma.barang.findMany({
    select: { barang_id: true, kode_perangkat: true }
  });
  const totalItems = items.length;

  console.log(`Gudang aktif: ${totalWarehouses}`);
  console.log(`Zona total: ${totalZones}`);
  console.log(`Items total: ${totalItems}`);
  console.log(`Expected stock rows (gudang × zona × item × 1 kondisi): ${totalWarehouses * totalZones * totalItems}`);
  console.log(`Expected with MOS>0 only: ${totalWarehouses * totalZones * 38} (38 items have MOS>0)`);

  // 2. Count actual stock rows
  const stockCount = await prisma.stok_gudang.count({
    where: {
      gudang_id: { in: warehouses.map(w => w.gudang_id) },
      kondisi: "baik"
    }
  });
  console.log(`\nActual stok_gudang rows (kondisi=baik): ${stockCount}`);

  // 3. Check per warehouse
  console.log("\n--- Stock per warehouse ---");
  for (const w of warehouses) {
    const wZones = zones.filter(z => z.gudang_id === w.gudang_id);
    const wStock = await prisma.stok_gudang.count({
      where: { gudang_id: w.gudang_id, kondisi: "baik" }
    });
    const expectedPerWh = wZones.length * totalItems;
    console.log(`  ${w.nama_gudang} (${w.gudang_id}): ${wStock} rows (expected ${expectedPerWh}, zones=${wZones.length})`);
    
    // Check per zone
    for (const z of wZones) {
      const zStock = await prisma.stok_gudang.count({
        where: { gudang_id: w.gudang_id, zona_id: z.zona_id, kondisi: "baik" }
      });
      console.log(`    Zone ${z.kode_zona} (${z.zona_id}): ${zStock} rows (expected ${totalItems})`);
    }
  }

  // 4. Check for missing items per warehouse/zone
  console.log("\n--- Checking for missing items ---");
  let missingTotal = 0;
  for (const w of warehouses) {
    const wZones = zones.filter(z => z.gudang_id === w.gudang_id);
    for (const z of wZones) {
      const stockItems = await prisma.stok_gudang.findMany({
        where: { gudang_id: w.gudang_id, zona_id: z.zona_id, kondisi: "baik" },
        select: { barang_id: true }
      });
      const stockItemIds = new Set(stockItems.map(s => String(s.barang_id)));
      const missing = items.filter(item => !stockItemIds.has(String(item.barang_id)));
      if (missing.length > 0) {
        missingTotal += missing.length;
        console.log(`  MISSING: ${w.nama_gudang}/${z.kode_zona} - ${missing.length} items missing`);
        missing.slice(0, 5).forEach(m => console.log(`    - ${m.kode_perangkat}`));
        if (missing.length > 5) console.log(`    ... and ${missing.length - 5} more`);
      }
    }
  }
  if (missingTotal === 0) {
    console.log("  ✅ All items present in all warehouse/zones");
  }

  // 5. Sample verification: 3 gudang, 3 zones, check qty = MOS
  console.log("\n--- Sample verification (qty = MOS) ---");
  
  // Recalculate MOS per item (same logic as seed)
  const boqItems = await prisma.boq_item.findMany({
    where: {
      boq: { status: { in: ["aktif", "draft", "selesai"] } },
      qty_mos: { not: null }
    },
    select: { barang_id: true, qty_mos: true }
  });

  const mosByItem = new Map();
  for (const bi of boqItems) {
    const barangId = String(bi.barang_id);
    const mos = Number(bi.qty_mos || 0);
    if (mos > 0) {
      const currentMax = mosByItem.get(barangId) || 0;
      if (mos > currentMax) {
        mosByItem.set(barangId, mos);
      }
    }
  }

  // Pick 3 warehouses, for each pick 1 zone, check 5 items
  const sampleItems = items.slice(0, 5);
  for (const w of warehouses) {
    const wZones = zones.filter(z => z.gudang_id === w.gudang_id);
    const sampleZone = wZones[0]; // First zone
    console.log(`\n  ${w.nama_gudang} / Zone ${sampleZone.kode_zona}:`);
    for (const item of sampleItems) {
      const barangId = String(item.barang_id);
      const expectedMos = mosByItem.get(barangId) || 0;
      
      const stock = await prisma.stok_gudang.findFirst({
        where: {
          gudang_id: w.gudang_id,
          zona_id: sampleZone.zona_id,
          barang_id: item.barang_id,
          kondisi: "baik"
        }
      });
      
      const actualQty = stock ? Number(stock.qty || 0) : 0;
      const match = actualQty === expectedMos ? "✅" : "❌";
      console.log(`    ${item.kode_perangkat}: expected=${expectedMos}, actual=${actualQty} ${match}`);
    }
  }

  // 6. Check stok_ledger entries created
  console.log("\n--- Stok Ledger entries ---");
  const ledgerCount = await prisma.stok_ledger.count();
  const ledgerByType = await prisma.stok_ledger.groupBy({
    by: ["jenis_mutasi"],
    _count: { _all: true }
  });
  console.log(`Total ledger entries: ${ledgerCount}`);
  ledgerByType.forEach(t => console.log(`  ${t.jenis_mutasi}: ${t._count._all}`));

  // 7. Show items with MOS=0 that were skipped
  console.log("\n--- Items with MOS=0 (skipped) ---");
  const itemsWithMos = new Set([...mosByItem.keys()]);
  const itemsZeroMos = items.filter(item => !itemsWithMos.has(String(item.barang_id)));
  console.log(`Items with no MOS in any cluster: ${itemsZeroMos.length}`);
  itemsZeroMos.slice(0, 10).forEach(item => console.log(`  ${item.kode_perangkat}`));
  if (itemsZeroMos.length > 10) console.log(`  ... and ${itemsZeroMos.length - 10} more`);

  await prisma.$disconnect();
  console.log("\n=== VERIFIKASI SELESAI ===");
}

verify().catch(e => { console.error(e); process.exit(1); });