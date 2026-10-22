#!/usr/bin/env node
/**
 * Seed Stok Gudang dengan MOS
 * 
 * Usage:
 *   node scripts/seed-stok-mos.js           # DRY-RUN (default)
 *   node scripts/seed-stok-mos.js --execute # Execute for real
 * 
 * Behavior:
 * - Default: DRY-RUN only prints summary, no DB writes
 * - --execute: Runs in single transaction, rollback on any error
 * - Idempotent: Uses upsert (create or update) based on unique constraint
 * - Creates stok_ledger entries for audit trail
 * - No DELETE/TRUNCATE operations
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes("--execute");
const KONDISI_DEFAULT = "baik"; // Default condition for seeding

async function main() {
  console.log(`=== Seed Stok Gudang dengan MOS ${DRY_RUN ? "(DRY-RUN)" : "(EXECUTE)"} ===\n`);

  if (DRY_RUN) {
    console.log("Mode: DRY-RUN - No database changes will be made.");
    console.log("Run with --execute to apply changes.\n");
  }

  try {
    // 1. Get all active warehouses
    const warehouses = await prisma.gudang.findMany({
      where: { is_aktif: true },
      select: { gudang_id: true, nama_gudang: true },
      orderBy: { gudang_id: "asc" }
    });
    console.log(`Found ${warehouses.length} active warehouses`);

    // 2. Get all zones for each warehouse
    const zonesByWarehouse = new Map();
    for (const w of warehouses) {
      const zones = await prisma.zona_gudang.findMany({
        where: { gudang_id: w.gudang_id },
        select: { zona_id: true, kode_zona: true, nama_zona: true },
        orderBy: { zona_id: "asc" }
      });
      zonesByWarehouse.set(w.gudang_id, zones);
      console.log(`  Gudang ${w.nama_gudang} (${w.gudang_id}): ${zones.length} zones`);
    }

    // 3. Get all items
    const items = await prisma.barang.findMany({
      select: { barang_id: true, kode_perangkat: true, nama_barang: true },
      orderBy: { barang_id: "asc" }
    });
    console.log(`\nFound ${items.length} items`);

    // 4. Calculate MOS per item (MAX across clusters)
    console.log("\n--- Calculating MOS per item (MAX across clusters) ---");
    const boqItems = await prisma.boq_item.findMany({
      where: {
        boq: { status: { in: ["aktif", "draft", "selesai"] } },
        qty_mos: { not: null }
      },
      select: {
        barang_id: true,
        qty_mos: true,
        boq: { select: { cluster_id: true } },
        cluster_id: true
      }
    });

    // Aggregate MAX MOS per item across clusters
    const mosByItem = new Map(); // barang_id -> max MOS
    const mosDetailsByItem = new Map(); // barang_id -> { cluster -> mos }
    
    for (const bi of boqItems) {
      const barangId = String(bi.barang_id);
      const clusterId = bi.boq?.cluster_id || bi.cluster_id || "NO_CLUSTER";
      const mos = Number(bi.qty_mos || 0);
      
      if (mos > 0) {
        if (!mosDetailsByItem.has(barangId)) {
          mosDetailsByItem.set(barangId, new Map());
        }
        mosDetailsByItem.get(barangId).set(clusterId, mos);
        
        const currentMax = mosByItem.get(barangId) || 0;
        if (mos > currentMax) {
          mosByItem.set(barangId, mos);
        }
      }
    }

    console.log(`Items with MOS > 0 in at least one cluster: ${mosByItem.size}`);
    
    // Show items with MOS
    let shown = 0;
    for (const [barangId, mos] of mosByItem.entries()) {
      if (shown < 10) {
        const item = items.find(i => String(i.barang_id) === barangId);
        const clusters = [...mosDetailsByItem.get(barangId).entries()];
        console.log(`  ${item?.kode_perangkat || barangId}: MOS=${mos} (clusters: ${clusters.map(([c,m])=>`${c}=${m}`).join(", ")})`);
        shown++;
      }
    }
    if (mosByItem.size > 10) console.log(`  ... and ${mosByItem.size - 10} more`);

    // 5. Prepare operations
    console.log("\n--- Preparing operations ---");
    const operations = []; // { gudang_id, zona_id, barang_id, mos, existing_qty, action }
    let createCount = 0;
    let updateCount = 0;
    let skipCount = 0;

    // Only process items with MOS > 0
    const itemsWithMos = items.filter(item => mosByItem.has(String(item.barang_id)));
    console.log(`Items with MOS > 0: ${itemsWithMos.length} (will process), MOS = 0: ${items.length - itemsWithMos.length} (will skip entirely)`);

    for (const warehouse of warehouses) {
      const zones = zonesByWarehouse.get(warehouse.gudang_id) || [];
      
      for (const zone of zones) {
        for (const item of itemsWithMos) {
          const barangId = String(item.barang_id);
          const mos = mosByItem.get(barangId) || 0;
          
          // Check existing stock
          const existing = await prisma.stok_gudang.findFirst({
            where: {
              gudang_id: warehouse.gudang_id,
              zona_id: zone.zona_id,
              barang_id: item.barang_id,
              kondisi: KONDISI_DEFAULT
            }
          });

          const existingQty = existing ? Number(existing.qty || 0) : 0;
          
          if (existing) {
            if (existingQty !== mos) {
              operations.push({
                gudang_id: warehouse.gudang_id,
                zona_id: zone.zona_id,
                barang_id: item.barang_id,
                kode_perangkat: item.kode_perangkat,
                nama_barang: item.nama_barang,
                warehouse_name: warehouse.nama_gudang,
                zone_name: zone.kode_zona,
                mos,
                existing_qty: existingQty,
                action: "UPDATE",
                stok_id: existing.stok_id
              });
              updateCount++;
            } else {
              skipCount++;
            }
          } else {
            operations.push({
              gudang_id: warehouse.gudang_id,
              zona_id: zone.zona_id,
              barang_id: item.barang_id,
              kode_perangkat: item.kode_perangkat,
              nama_barang: item.nama_barang,
              warehouse_name: warehouse.nama_gudang,
              zone_name: zone.kode_zona,
              mos,
              existing_qty: 0,
              action: "CREATE"
            });
            createCount++;
          }
        }
      }
    }

    console.log(`\nSummary of operations:`);
    console.log(`  CREATE: ${createCount} rows (new stock with MOS > 0)`);
    console.log(`  UPDATE: ${updateCount} rows (existing stock with different qty)`);
    console.log(`  SKIP:   ${skipCount} rows (already at MOS or MOS=0)`);
    console.log(`  TOTAL:  ${createCount + updateCount + skipCount} combinations checked`);

    // Show samples
    console.log("\n--- Sample operations (first 5 each) ---");
    console.log("CREATE samples:");
    operations.filter(o => o.action === "CREATE").slice(0, 5).forEach(o => 
      console.log(`  [${o.warehouse_name}/${o.zone_name}] ${o.kode_perangkat}: qty=${o.mos}`)
    );
    console.log("UPDATE samples:");
    operations.filter(o => o.action === "UPDATE").slice(0, 5).forEach(o => 
      console.log(`  [${o.warehouse_name}/${o.zone_name}] ${o.kode_perangkat}: ${o.existing_qty} -> ${o.mos}`)
    );

    if (DRY_RUN) {
      console.log("\n=== DRY-RUN COMPLETE ===");
      console.log("No changes made. Run with --execute to apply.");
      return;
    }

    // 6. Execute in transaction
    console.log("\n--- Executing in transaction ---");
    await prisma.$transaction(async (tx) => {
      let processed = 0;
      for (const op of operations) {
        if (op.action === "CREATE") {
          const newStock = await tx.stok_gudang.create({
            data: {
              gudang_id: op.gudang_id,
              zona_id: op.zona_id,
              barang_id: op.barang_id,
              project_id: null,
              kondisi: KONDISI_DEFAULT,
              qty: op.mos
            }
          });
          
          // Create ledger entry
          await tx.stok_ledger.create({
            data: {
              barang_id: op.barang_id,
              jenis_mutasi: "in",
              qty: op.mos,
              saldo_setelah: op.mos,
              cluster_id: null,
              surat_jalan_item_id: null
            }
          });
        } else if (op.action === "UPDATE") {
          await tx.stok_gudang.update({
            where: { stok_id: op.stok_id },
            data: { qty: op.mos, updated_at: new Date() }
          });
          
          // Create ledger entry for adjustment
          const diff = op.mos - op.existing_qty;
          await tx.stok_ledger.create({
            data: {
              barang_id: op.barang_id,
              jenis_mutasi: diff > 0 ? "in" : "out",
              qty: Math.abs(diff),
              saldo_setelah: op.mos,
              cluster_id: null,
              surat_jalan_item_id: null
            }
          });
        }
        processed++;
        if (processed % 100 === 0) {
          console.log(`  Processed ${processed}/${operations.length}...`);
        }
      }
      console.log(`  Completed ${processed} operations`);
    });

    console.log("\n=== EXECUTION COMPLETE ===");
    console.log(`Created: ${createCount}, Updated: ${updateCount}, Skipped: ${skipCount}`);

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();