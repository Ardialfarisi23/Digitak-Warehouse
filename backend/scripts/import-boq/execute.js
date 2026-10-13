// backend/scripts/import-boq/execute.js
// Eksekusi import (TULIS SAJA, JANGAN DIJALANKAN OTOMATIS)

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { createAuditLog } = require('../../src/utils/audit-log');
const { getJakartaYear, formatBoqNumber, parseBoqSequence } = require('../../src/modules/boq/boq-number.util');

const prisma = new PrismaClient();

function checkBackupRecent() {
  const backupDir = path.resolve(__dirname, '..', '..', '..');
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup_before_boq_import_') && f.endsWith('.dump'))
    .map(f => ({ name: f, path: path.join(backupDir, f) }))
    .map(f => ({ ...f, stat: fs.statSync(f.path) }))
    .filter(f => f.stat.size > 0)
    .filter(f => (Date.now() - f.stat.mtimeMs) < 24 * 60 * 60 * 1000)
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  return files[0] || null;
}

async function generateBoqNumber(tx) {
  const now = new Date();
  const year = getJakartaYear(now);
  const lastBoq = await tx.boq.findFirst({
    where: { boq_number: { startsWith: `BOQ-${year}` } },
    orderBy: { boq_id: 'desc' },
    select: { boq_number: true },
  });

  let nextNumber = 1;
  const lastSeq = parseBoqSequence(lastBoq?.boq_number);
  if (lastSeq !== null) {
    nextNumber = lastSeq + 1;
  }
  return formatBoqNumber(now, nextNumber);
}

async function executeImport(planResult, userId) {
  const { plan, blockers } = planResult;

  // 1. Validasi pre-syarat
  if (blockers.length > 0) {
    throw new Error(`BLOCKER ditemukan: ${blockers.join('; ')}`);
  }

  // 2. Cek backup
  const backup = checkBackupRecent();
  if (!backup) {
    throw new Error('Backup file backup_before_boq_import_*.dump tidak ditemukan atau size=0 atau >24 jam di D:\\Project\\digitak-warehouse');
  }
  console.log(`Using backup: ${backup.name} (${(backup.stat.size/1024).toFixed(1)} KB)`);

  // 3. Cek user
  const user = await prisma.user_account.findUnique({
    where: { user_id: BigInt(userId) },
    select: { user_id: true, nama: true, role: true },
  });
  if (!user) throw new Error(`User ID ${userId} tidak ditemukan`);
  if (!['admin_general', 'supervisor'].includes(user.role)) {
    throw new Error(`User ${user.nama} role ${user.role} tidak punya izin import`);
  }

  // 4. Lookup barang map
  const allCodes = [...new Set(plan.clusters.flatMap(c => c.items.map(i => i.material_code)).filter(Boolean))];
  const barangMap = new Map();
  for (const code of allCodes) {
    const b = await prisma.barang.findUnique({
      where: { kode_perangkat: code },
      select: { barang_id: true, satuan_default_id: true },
    });
    if (b) barangMap.set(code, b);
  }

  // 5. Eksekusi dalam transaksi
  const manifest = {
    timestamp: new Date().toISOString(),
    user_id: userId,
    project_id: null,
    tiket_id: null,
    clusters: [],
    boqs: [],
    boq_items: [],
  };

  await prisma.$transaction(async (tx) => {
    // 5.1 Create Project
    const projData = plan.project.data || plan.project;
    const project = await tx.project.create({
      data: {
        nama_project: projData.nama_project,
        title: projData.title,
        area: projData.area,
        kota_kabupaten: projData.kota_kabupaten,
        kecamatan: projData.kecamatan,
        desa_kelurahan: projData.desa_kelurahan,
        provinsi: projData.provinsi,
        klien: projData.klien,
        status_aktif: projData.status_aktif,
        created_by: BigInt(userId),
        updated_by: BigInt(userId),
      },
    });
    manifest.project_id = Number(project.project_id);
    console.log(`Created project: ${project.nama_project} (ID: ${project.project_id})`);

    // Audit log project
    await createAuditLog({
      entityType: 'project',
      entityId: project.project_id,
      aksi: 'create',
      actorId: BigInt(userId),
      dataSebelum: null,
      dataSesudah: { ...project, source: 'excel_import' },
    }, tx);

    // 5.2 Create 13 Clusters
    for (const cPlan of plan.clusters) {
      if (cPlan.action !== 'create') {
        const existing = await tx.cluster.findUnique({ where: { cluster_id: cPlan.cluster_id } });
        if (existing) {
          manifest.clusters.push({ cluster_id: cPlan.cluster_id, cluster_db_id: Number(existing.cluster_id), action: 'skipped' });
          continue;
        }
      }

      const cluster = await tx.cluster.create({
        data: {
          cluster_id: cPlan.cluster_id,
          project_id: project.project_id,
          nama_cluster: cPlan.nama_cluster,
          homepass_plan: cPlan.homepass_plan,
          no_tiket_release: cPlan.no_tiket_release,
          status_aktif: true,
          created_by: BigInt(userId),
          updated_by: BigInt(userId),
        },
      });
      manifest.clusters.push({ cluster_id: cPlan.cluster_id, cluster_db_id: Number(cluster.cluster_id), action: 'created' });
      console.log(`Created cluster: ${cluster.cluster_id} (ID: ${cluster.cluster_id})`);

      await createAuditLog({
        entityType: 'cluster',
        entityId: cluster.cluster_id,
        aksi: 'create',
        actorId: BigInt(userId),
        dataSebelum: null,
        dataSesudah: { ...cluster, source: 'excel_import' },
      }, tx);

      // 5.3 Create BOQ per cluster
      if (cPlan.boq_action === 'create') {
        const boqNumber = await generateBoqNumber(tx);
        const boq = await tx.boq.create({
          data: {
            cluster_id: cluster.cluster_id,
            boq_number: boqNumber,
            status: 'draft',
            source: 'top_down',
            tiket_id: null,
            created_by: BigInt(userId),
            updated_by: BigInt(userId),
          },
        });
        manifest.boqs.push({ cluster_id: cPlan.cluster_id, boq_id: Number(boq.boq_id), boq_number: boq.boq_number });
        console.log(`Created BOQ: ${boq.boq_number} (ID: ${boq.boq_id}) for cluster ${cluster.cluster_id}`);

        await createAuditLog({
          entityType: 'boq',
          entityId: boq.boq_id,
          aksi: 'create',
          actorId: BigInt(userId),
          dataSebelum: null,
          dataSesudah: { boq_number: boq.boq_number, status: boq.status, cluster_id: cluster.cluster_id, source: 'excel_import', item_count: cPlan.items.filter(i => i.action === 'create').length },
        }, tx);

        // 5.4 Create BOQ Items
        const itemsToCreate = cPlan.items
          .filter(i => i.action === 'create')
          .map(item => {
            const barang = barangMap.get(item.material_code);
            if (!barang) throw new Error(`Barang ${item.material_code} tidak ditemukan di map`);
            return {
              boq_id: boq.boq_id,
              barang_id: BigInt(barang.barang_id),
              qty_rencana: item.boq_plan !== null ? item.boq_plan : 0,
              qty_additional: item.additional,
              qty_mos: item.mos,
              qty_used: item.used,
              satuan_id: BigInt(barang.satuan_default_id),
              gudang_tujuan_id: null,
              cluster_id: cluster.cluster_id,
            };
          });

        if (itemsToCreate.length > 0) {
          await tx.boq_item.createMany({ data: itemsToCreate, skipDuplicates: true });
          const createdItems = await tx.boq_item.findMany({
            where: { boq_id: boq.boq_id },
            select: { boq_item_id: true, barang_id: true },
          });
          for (const ci of createdItems) {
            manifest.boq_items.push({ boq_id: Number(boq.boq_id), barang_id: Number(ci.barang_id), boq_item_id: Number(ci.boq_item_id) });
          }
          console.log(`  Created ${createdItems.length} BOQ items for ${boq.boq_number}`);
        }
      } else {
        manifest.boqs.push({ cluster_id: cPlan.cluster_id, action: 'skipped', reason: cPlan.boq_reason });
      }
    }
  });

  // 6. Simpan manifest
  const manifestPath = path.join(config.OUTPUT_DIR, config.MANIFEST_FILE);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Manifest saved to ${manifestPath}`);

  return manifest;
}

module.exports = { executeImport, generateBoqNumber, checkBackupRecent };