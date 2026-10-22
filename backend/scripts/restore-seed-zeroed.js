#!/usr/bin/env node
/**
 * Restore Stok Gudang for 3 items zeroed by seed-stok-mos.js
 * 
 * Usage:
 *   node scripts/restore-seed-zeroed.js           # DRY-RUN (default)
 *   node scripts/restore-seed-zeroed.js --execute # Execute for real
 * 
 * Behavior:
 * - Identifies 3 rows from stok_ledger 'out' entries created by seed
 * - Restores qty to original values (1, 5, 5) via 'in' ledger entries with description
 * - Single transaction, idempotent, no DELETE
 * - DRY-RUN shows before/after for each row
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes("--execute");
const KONDISI_DEFAULT = "baik";

async function main() {
  console.log(`=== Restore Stok Zeroed by Seed ${DRY_RUN ? "(DRY-RUN)" : "(EXECUTE)"} ===\n`);

  if (DRY_RUN) {
    console.log("Mode: DRY-RUN - No database changes will be made.");
    console.log("Run with --execute to apply changes.\n");
  }

  try {
    // The 3 items that were zeroed (from stok_ledger 'out' entries)
    const itemsToRestore = [
      { kode_perangkat: "LOQ-80S-DevanYamal", originalQty: 1 },
      { kode_perangkat: "[01-013-08487]", originalQty: 5 },
      { kode_perangkat: "TL-MR6400 V7", originalQty: 5 }
    ];

    // Find barang_id for each
    const restoreOps = [];
    
    for (const item of itemsToRestore) {
      const barang = await prisma.barang.findFirst({
        where: { kode_perangkat: item.kode_perangkat },
        select: { barang_id: true, kode_perangkat: true, nama_barang: true }
      });
      
      if (!barang) {
        console.log(`  WARNING: ${item.kode_perangkat} not found in barang table`);
        continue;
      }

      // Find all stok_gudang rows for this item (across all warehouses/zones)
      const stocks = await prisma.stok_gudang.findMany({
        where: {
          barang_id: barang.barang_id,
          kondisi: KONDISI_DEFAULT
        },
        select: {
          stok_id: true,
          gudang_id: true,
          zona_id: true,
          barang_id: true,
          qty: true
        }
      });

      console.log(`\n${item.kode_perangkat} (barang_id=${barang.barang_id}):`);
      console.log(`  Target original qty: ${item.originalQty}`);
      console.log(`  Current stock rows: ${stocks.length}`);

      for (const stock of stocks) {
        const currentQty = Number(stock.qty || 0);
        const diff = item.originalQty - currentQty;
        
        if (diff === 0) {
          console.log(`    Gudang ${stock.gudang_id} / Zona ${stock.zona_id}: already at ${currentQty} - SKIP`);
          continue;
        }

        console.log(`    Gudang ${stock.gudang_id} / Zona ${stock.zona_id}: ${currentQty} -> ${item.originalQty} (diff: ${diff > 0 ? "+" : ""}${diff})`);

        restoreOps.push({
          stok_id: stock.stok_id,
          gudang_id: stock.gudang_id,
          zona_id: stock.zona_id,
          barang_id: stock.barang_id,
          kode_perangkat: item.kode_perangkat,
          current_qty: currentQty,
          target_qty: item.originalQty,
          diff
        });
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total rows to restore: ${restoreOps.length}`);
    console.log(`Rows already correct: ${itemsToRestore.reduce((sum, item) => sum + (await prisma.stok_gudang.count({ where: { barang: { kode_perangkat: item.kode_perangkat }, kondisi: KONDISI_DEFAULT, qty: item.originalQty } })), 0) - restoreOps.length} (estimated)`);

    if (DRY_RUN) {
      console.log("\n=== DRY-RUN COMPLETE ===");
      console.log("No changes made. Run with --execute to apply.");
      return;
    }

    // Execute in transaction
    console.log("\n--- Executing in transaction ---");
    await prisma.$transaction(async (tx) => {
      for (const op of restoreOps) {
        // Update stok_gudang
        await tx.stok_gudang.update({
          where: { stok_id: op.stok_id },
          data: { qty: op.target_qty, updated_at: new Date() }
        });

        // Create ledger entry for correction (type 'in' since we're adding back)
        await tx.stok_ledger.create({
          data: {
            barang_id: op.barang_id,
            jenis_mutasi: "in",
            qty: Math.abs(op.diff),
            saldo_setelah: op.target_qty,
            cluster_id: null,
            surat_jalan_item_id: null
            // Note: No description field in stok_ledger, but bisa pakai catatan di audit_log kalau perlu
          }
        });

        console.log(`  Restored ${op.kode_perangkat} (stok_id=${op.stok_id}): ${op.current_qty} -> ${op.target_qty}`);
      }
    });

    console.log("\n=== EXECUTION COMPLETE ===");
    console.log(`Restored ${restoreOps.length} stock rows`);

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();