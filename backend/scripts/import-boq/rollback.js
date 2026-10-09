// backend/scripts/import-boq/rollback.js
// Rollback import berdasarkan manifest (TULIS SAJA, JANGAN DIJALANKAN OTOMATIS)

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const prisma = new PrismaClient();

async function checkReferences(tx, manifest) {
  const errors = [];

  // Cek boq_item yang direferensi oleh tabel lain
  if (manifest.boq_items.length > 0) {
    const itemIds = manifest.boq_items.map(i => BigInt(i.boq_item_id));
    
    // Cek di tabel yang mungkin referensikan boq_item
    const checks = [
      { table: 'surat_jalan_item', fk: 'boq_item_id' },
      { table: 'tiket_material_item', fk: 'boq_item_id' },
      { table: 'transfer_gudang_item', fk: 'boq_item_id' },
      { table: 'pengembalian_item', fk: 'boq_item_id' },
    ];

    for (const { table, fk } of checks) {
      try {
        const count = await tx.$queryRaw`
          SELECT count(*) as cnt FROM ${table} WHERE ${fk} IN (${Prisma.join(itemIds)})
        `;
        if (Number(count[0].cnt) > 0) {
          errors.push(`Tabel ${table} mereferensikan ${Number(count[0].cnt)} boq_item yang akan dihapus`);
        }
      } catch (e) {
        // Tabel mungkin tidak ada, abaikan
      }
    }
  }

  // Cek BOQ yang direferensi
  if (manifest.boqs.length > 0) {
    const boqIds = manifest.boqs.filter(b => b.boq_id).map(b => BigInt(b.boq_id));
    if (boqIds.length > 0) {
      const checks = [
        { table: 'surat_jalan', fk: 'boq_id' },
        { table: 'tiket_material', fk: 'boq_id' },
        { table: 'reconciliation', fk: 'boq_id' },
      ];

      for (const { table, fk } of checks) {
        try {
          const count = await tx.$queryRaw`
            SELECT count(*) as cnt FROM ${table} WHERE ${fk} IN (${Prisma.join(boqIds)})
          `;
          if (Number(count[0].cnt) > 0) {
            errors.push(`Tabel ${table} mereferensikan ${Number(count[0].cnt)} BOQ yang akan dihapus`);
          }
        } catch (e) {}
      }
    }
  }

  // Cek cluster yang direferensi
  if (manifest.clusters.length > 0) {
    const clusterIds = manifest.clusters.filter(c => c.cluster_db_id).map(c => c.cluster_db_id);
    if (clusterIds.length > 0) {
      const checks = [
        { table: 'cluster_user', fk: 'cluster_id' },
        { table: 'survey', fk: 'cluster_id' },
      ];
      for (const { table, fk } of checks) {
        try {
          const count = await tx.$queryRaw`
            SELECT count(*) as cnt FROM ${table} WHERE ${fk} IN (${Prisma.join(clusterIds)})
          `;
          if (Number(count[0].cnt) > 0) {
            errors.push(`Tabel ${table} mereferensikan ${Number(count[0].cnt)} cluster yang akan dihapus`);
          }
        } catch (e) {}
      }
    }
  }

  // Cek project yang direferensi
  if (manifest.project_id) {
    const checks = [
      { table: 'cluster', fk: 'project_id' },
      { table: 'project_user', fk: 'project_id' },
    ];
    for (const { table, fk } of checks) {
      try {
        const count = await tx.$queryRaw`
          SELECT count(*) as cnt FROM ${table} WHERE ${fk} = ${manifest.project_id}
        `;
        if (Number(count[0].cnt) > 0) {
          errors.push(`Tabel ${table} mereferensikan project ID ${manifest.project_id} yang akan dihapus`);
        }
      } catch (e) {}
    }
  }

  return errors;
}

async function rollbackImport(dryRun = true) {
  const manifestPath = path.join(config.OUTPUT_DIR, config.MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest tidak ditemukan: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`Manifest loaded: ${manifest.timestamp}, user: ${manifest.user_id}`);

  // Cek referensi
  const refErrors = await checkReferences(prisma, manifest);
  if (refErrors.length > 0) {
    console.log('REFERENSI DITEMUKAN (rollback ditolak):');
    for (const e of refErrors) console.log(`  - ${e}`);
    if (!dryRun) throw new Error('Rollback ditolak: ada referensi dari tabel lain');
    return { success: false, dryRun: true, errors: refErrors };
  }

  if (dryRun) {
    console.log('=== DRY-RUN ROLLBACK ===');
    console.log(`Akan dihapus:`);
    console.log(`  BOQ Items: ${manifest.boq_items.length}`);
    console.log(`  BOQs: ${manifest.boqs.filter(b => b.boq_id).length}`);
    console.log(`  Clusters: ${manifest.clusters.filter(c => c.action === 'created').length}`);
    console.log(`  Project: ${manifest.project_id ? 1 : 0}`);
    console.log('\nJalankan dengan --execute untuk menghapus.');
    return { success: true, dryRun: true, deleted: { boq_items: manifest.boq_items.length, boqs: manifest.boqs.length, clusters: manifest.clusters.length, project: manifest.project_id ? 1 : 0 } };
  }

  // Execute rollback dalam transaksi (urutan FK-safe)
  await prisma.$transaction(async (tx) => {
    // 1. Hapus BOQ Items
    if (manifest.boq_items.length > 0) {
      const itemIds = manifest.boq_items.map(i => BigInt(i.boq_item_id));
      await tx.boq_item.deleteMany({ where: { boq_item_id: { in: itemIds } } });
      console.log(`Deleted ${manifest.boq_items.length} BOQ items`);
    }

    // 2. Hapus BOQs
    const createdBoqs = manifest.boqs.filter(b => b.boq_id && b.action !== 'skipped');
    if (createdBoqs.length > 0) {
      const boqIds = createdBoqs.map(b => BigInt(b.boq_id));
      await tx.boq.deleteMany({ where: { boq_id: { in: boqIds } } });
      console.log(`Deleted ${createdBoqs.length} BOQs`);
    }

    // 3. Hapus Clusters
    const createdClusters = manifest.clusters.filter(c => c.action === 'created');
    if (createdClusters.length > 0) {
      const clusterIds = createdClusters.map(c => c.cluster_id);
      await tx.cluster.deleteMany({ where: { cluster_id: { in: clusterIds } } });
      console.log(`Deleted ${createdClusters.length} clusters`);
    }

    // 4. Hapus Project
    if (manifest.project_id) {
      await tx.project.delete({ where: { project_id: BigInt(manifest.project_id) } });
      console.log(`Deleted project ${manifest.project_id}`);
    }
  });

  // Backup manifest
  const backupPath = manifestPath.replace('.json', `-rollback-${Date.now()}.json`);
  fs.renameSync(manifestPath, backupPath);
  console.log(`Manifest moved to ${backupPath}`);

  return { success: true, dryRun: false };
}

module.exports = { rollbackImport, checkReferences };