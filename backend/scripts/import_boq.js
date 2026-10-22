const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { getJakartaYear, formatBoqNumber, parseBoqSequence } = require('../src/modules/boq/boq-number.util');

const prisma = new PrismaClient();

// Load extracted data
const extractPath = path.join(__dirname, '..', 'data', 'boq_extract.json');
const extract = JSON.parse(fs.readFileSync(extractPath, 'utf-8'));

const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const BATCH_SIZE = 100;

console.log(`=== BOQ IMPORT ${DRY_RUN ? '(DRY-RUN)' : '(APPLY)'} ===`);
console.log(`Source: ${extract.source_file} (${extract.sheet})`);
console.log(`Extracted: ${extract.extracted_at}`);
console.log(`Materials: ${extract.validation.total_materials}, Clusters: ${extract.validation.total_clusters}, Records: ${extract.validation.total_records}`);
console.log(`Discrepancies (ignored): ${extract.validation.discrepancies.length}`);
console.log('');

// Stats
const stats = {
  satuan: { created: 0, exists: 0 },
  material: { created: 0, updated: 0, exists: 0, skipped: 0 },
  cluster: { created: 0, updated: 0, exists: 0 },
  tiket: { created: 0, exists: 0, placeholder: 0 },
  boq: { created: 0, updated: 0, exists: 0 },
  boq_item: { created: 0, updated: 0, skipped: 0 },
  additional: { created: 0, updated: 0, exists: 0 },
  errors: []
};

async function getOrCreateSatuan(kode) {
  const existing = await prisma.satuan.findUnique({ where: { kode_satuan: kode } });
  if (existing) {
    stats.satuan.exists++;
    return existing.satuan_id;
  }
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would create satuan: ${kode}`);
    stats.satuan.created++;
    return `new-satuan-${kode}`;
  }
  const created = await prisma.satuan.create({ data: { kode_satuan: kode } });
  stats.satuan.created++;
  return created.satuan_id;
}

async function getOrCreateMaterial(mat, kategoriId, defaultSatuanId) {
  // Try exact match first
  let existing = await prisma.barang.findUnique({ where: { kode_perangkat: mat.kode_perangkat } });
  
  // If not found and code has brackets, try with normalized brackets
  if (!existing && mat.kode_perangkat.includes('[')) {
    // Try with closing bracket if missing
    const withCloseBracket = mat.kode_perangkat.endsWith(']') ? mat.kode_perangkat : mat.kode_perangkat + ']';
    existing = await prisma.barang.findUnique({ where: { kode_perangkat: withCloseBracket } });
    if (existing) {
      console.log(`  MATCHED with bracket fix: ${mat.kode_perangkat} -> ${withCloseBracket}`);
    }
  }
  
  // If still not found, try without brackets
  if (!existing) {
    const noBracket = mat.kode_perangkat.replace(/[\[\]]/g, '');
    existing = await prisma.barang.findUnique({ where: { kode_perangkat: noBracket } });
    if (existing) {
      console.log(`  MATCHED without brackets: ${mat.kode_perangkat} -> ${noBracket}`);
    }
  }
  
  // If still not found, try by name (only for materials without code like 'In MSP')
  if (!existing && (!mat.kode_perangkat || mat.kode_perangkat === 'In MSP')) {
    existing = await prisma.barang.findFirst({ where: { nama_barang: mat.nama_barang } });
    if (existing) {
      console.log(`  MATCHED by NAME: ${mat.kode_perangkat} -> ${existing.kode_perangkat}`);
    }
  }

  if (existing) {
    // For Batang materials, use existing satuan from DB instead of creating 'batang'
    let satuanId = defaultSatuanId;
    if (mat.satuan_normalized === 'batang' && existing.satuan_default_id) {
      satuanId = existing.satuan_default_id;
      console.log(`  Using existing satuan for ${mat.kode_perangkat}: ${satuanId} (was batang)`);
    }
    
    // Update if needed
    const needsUpdate = existing.nama_barang !== mat.nama_barang || 
                        existing.satuan_default_id !== satuanId ||
                        existing.kategori_id !== kategoriId;
    if (needsUpdate && !DRY_RUN) {
      await prisma.barang.update({
        where: { barang_id: existing.barang_id },
        data: { nama_barang: mat.nama_barang, satuan_default_id: satuanId, kategori_id: kategoriId }
      });
      stats.material.updated++;
    } else {
      stats.material.exists++;
    }
    return existing.barang_id;
  }
  
  // Skip creating [01-013-03725] if it exists in DB with bracket fix and has no boq_plan > 0
  if (mat.kode_perangkat.includes('03725')) {
    const data = require('./data/boq_extract.json');
    const hasBoqPlan = data.records.some(r => r.kode_perangkat.includes('03725') && r.boq_plan > 0);
    if (!hasBoqPlan) {
      console.log(`  SKIP creating ${mat.kode_perangkat}: no boq_plan > 0 in any cluster`);
      stats.material.skipped++;
      return null;
    }
  }

  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would create material: ${mat.kode_perangkat} | ${mat.nama_barang} | satuan: ${mat.satuan_normalized}`);
    stats.material.created++;
    return `new-material-${mat.kode_perangkat}`;
  }
  const created = await prisma.barang.create({
    data: {
      kode_perangkat: mat.kode_perangkat,
      nama_barang: mat.nama_barang,
      kategori_id: kategoriId,
      satuan_default_id: defaultSatuanId,
      created_by: 1n, // admin
      updated_by: 1n
    }
  });
  stats.material.created++;
  return created.barang_id;
}

async function getOrCreateCluster(cluster) {
  const existing = await prisma.cluster.findUnique({ where: { cluster_id: cluster.cluster_id } });
  if (existing) {
    // Update if needed
    const needsUpdate = existing.nama_cluster !== cluster.nama_cluster ||
                        existing.homepass_plan !== cluster.homepass_plan ||
                        existing.no_tiket_release !== cluster.no_tiket_release;
    if (needsUpdate && !DRY_RUN) {
      await prisma.cluster.update({
        where: { cluster_id: cluster.cluster_id },
        data: { 
          nama_cluster: cluster.nama_cluster, 
          homepass_plan: cluster.homepass_plan, 
          no_tiket_release: cluster.no_tiket_release,
          updated_by: 1n
        }
      });
      stats.cluster.updated++;
    } else {
      stats.cluster.exists++;
    }
    return existing.cluster_id;
  }
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would create cluster: ${cluster.cluster_id} | ${cluster.nama_cluster} | HP: ${cluster.homepass_plan} | Tiket: ${cluster.no_tiket_release}`);
    stats.cluster.created++;
    return cluster.cluster_id;
  }
  const created = await prisma.cluster.create({
    data: {
      cluster_id: cluster.cluster_id,
      project_id: BigInt(cluster.project_id),
      nama_cluster: cluster.nama_cluster,
      homepass_plan: cluster.homepass_plan,
      no_tiket_release: cluster.no_tiket_release,
      status_aktif: true,
      created_by: 1n,
      updated_by: 1n
    }
  });
  stats.cluster.created++;
  return created.cluster_id;
}

async function getOrCreateTiket(tiketData) {
  // Check by kode_tiket
  const existing = await prisma.tiket_material.findUnique({ where: { kode_tiket: tiketData.kode_tiket } });
  if (existing) {
    stats.tiket.exists++;
    return existing.tiket_id;
  }
  if (DRY_RUN) {
    const isPlaceholder = tiketData.kode_tiket.startsWith('TANPA-TIKET');
    if (isPlaceholder) stats.tiket.placeholder++;
    console.log(`  [DRY-RUN] Would create tiket: ${tiketData.kode_tiket} | project: ${tiketData.project_id} | cluster: ${tiketData.cluster_id}`);
    stats.tiket.created++;
    return `new-tiket-${tiketData.kode_tiket}`;
  }
  const created = await prisma.tiket_material.create({
    data: {
      kode_tiket: tiketData.kode_tiket,
      project_id: BigInt(tiketData.project_id),
      cluster_id: tiketData.cluster_id,
      area: tiketData.area || null,
      mos: 0,
      used: 0,
      created_by: 1n
    }
  });
  if (tiketData.kode_tiket.startsWith('TANPA-TIKET')) stats.tiket.placeholder++;
  stats.tiket.created++;
  return created.tiket_id;
}

async function getOrCreateBoq(tiketId, clusterId) {
  // In dry-run with placeholder tiket, skip DB lookup
  if (DRY_RUN && String(tiketId).startsWith('new-tiket-')) {
    console.log(`  [DRY-RUN] Would create BOQ for tiket ${tiketId} | cluster ${clusterId}`);
    stats.boq.created++;
    return `new-boq-${tiketId}`;
  }
  
  // Check if BOQ exists for this tiket
  const existing = await prisma.boq.findUnique({ where: { tiket_id: BigInt(tiketId) } });
  if (existing) {
    stats.boq.exists++;
    return existing.boq_id;
  }
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would create BOQ for tiket ${tiketId} | cluster ${clusterId}`);
    stats.boq.created++;
    return `new-boq-${tiketId}`;
  }
  // Generate BOQ number
  const now = new Date();
  const year = getJakartaYear(now);
  const lastBoq = await prisma.boq.findFirst({
    where: { boq_number: { startsWith: `BOQ-${year}` } },
    orderBy: { boq_id: 'desc' },
    select: { boq_number: true }
  });
  let nextNumber = 1;
  const lastSeq = parseBoqSequence(lastBoq?.boq_number);
  if (lastSeq !== null) {
    nextNumber = lastSeq + 1;
  }
  const boqNumber = formatBoqNumber(now, nextNumber);
  
  const created = await prisma.boq.create({
    data: {
      tiket_id: BigInt(tiketId),
      cluster_id: clusterId,
      boq_number: boqNumber,
      status: 'draft',
      source: 'top_down',
      external_verification_status: 'menunggu',
      created_by: 1n,
      updated_by: 1n
    }
  });
  stats.boq.created++;
  return created.boq_id;
}

async function upsertBoqItems(boqId, clusterId, items) {
  // items: array of { barang_id, qty_rencana, satuan_id }
  for (const item of items) {
    // In dry-run with placeholder BOQ, skip DB lookup
    if (DRY_RUN && String(boqId).startsWith('new-boq-')) {
      console.log(`  [DRY-RUN] Would create boq_item: boq=${boqId}, barang=${item.barang_id}, qty=${item.qty_rencana}, satuan=${item.satuan_id}`);
      stats.boq_item.created++;
      continue;
    }
    
    const existing = await prisma.boq_item.findFirst({
      where: { boq_id: BigInt(boqId), barang_id: BigInt(item.barang_id) }
    });
    if (existing) {
      if (!DRY_RUN && (Number(existing.qty_rencana) !== item.qty_rencana || existing.satuan_id !== item.satuan_id)) {
        await prisma.boq_item.update({
          where: { boq_item_id: existing.boq_item_id },
          data: { qty_rencana: item.qty_rencana, satuan_id: item.satuan_id, cluster_id: clusterId }
        });
        stats.boq_item.updated++;
      } else {
        stats.boq_item.exists++;
      }
    } else {
      if (DRY_RUN) {
        console.log(`  [DRY-RUN] Would create boq_item: boq=${boqId}, barang=${item.barang_id}, qty=${item.qty_rencana}, satuan=${item.satuan_id}`);
        stats.boq_item.created++;
      } else {
        await prisma.boq_item.create({
          data: {
            boq_id: BigInt(boqId),
            barang_id: BigInt(item.barang_id),
            qty_rencana: item.qty_rencana,
            satuan_id: item.satuan_id,
            cluster_id: clusterId,
            gudang_tujuan_id: null
          }
        });
        stats.boq_item.created++;
      }
    }
  }
}

async function upsertAdditionalAdjustment(projectId, barangId, qty, alasan) {
  const existing = await prisma.additional_adjustment.findFirst({
    where: { project_id: BigInt(projectId), barang_id: BigInt(barangId) }
  });
  if (existing) {
    if (!DRY_RUN && Number(existing.qty) !== qty) {
      await prisma.additional_adjustment.update({
        where: { adjustment_id: existing.adjustment_id },
        data: { qty, alasan }
      });
      stats.additional.updated++;
    } else {
      stats.additional.exists++;
    }
  } else {
    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would create additional_adjustment: project=${projectId}, barang=${barangId}, qty=${qty}`);
      stats.additional.created++;
    } else {
      await prisma.additional_adjustment.create({
        data: {
          project_id: BigInt(projectId),
          barang_id: BigInt(barangId),
          qty,
          alasan,
          created_by: 1n
        }
      });
      stats.additional.created++;
    }
  }
}

async function main() {
  try {
    // 1. SATUAN - ensure 'batang' exists ONLY if needed by records
    console.log('\n--- STEP 1: SATUAN ---');
    const satuanMap = {};
    const satuanList = ['pcs', 'roll', 'meter', 'unit', 'box']; // 'batang' not created unless needed
    for (const s of satuanList) {
      satuanMap[s] = await getOrCreateSatuan(s);
    }
    console.log(`Satuan: created=${stats.satuan.created}, exists=${stats.satuan.exists}`);

    // 2. KATEGORI - ensure "Kabel & Aksesoris" exists
    console.log('\n--- STEP 2: KATEGORI ---');
    let kategori = await prisma.kategori_barang.findUnique({ where: { nama_kategori: 'Kabel & Aksesoris' } });
    if (!kategori) {
      if (DRY_RUN) {
        console.log('  [DRY-RUN] Would create kategori: Kabel & Aksesoris');
        kategori = { kategori_id: 1n };
      } else {
        kategori = await prisma.kategori_barang.create({ data: { nama_kategori: 'Kabel & Aksesoris', is_kritis: false } });
      }
    }
    const kategoriId = kategori.kategori_id;
    console.log(`Kategori: ${kategori.nama_kategori} (${kategoriId})`);

    // 3. MATERIALS - prepare material map with satuan_db_id
    console.log('\n--- STEP 3: MATERIALS ---');
    const materialMap = {};
    for (const mat of extract.materials) {
      mat.satuan_db_id = satuanMap[mat.satuan_normalized];
      if (!mat.satuan_db_id) {
        console.warn(`  WARNING: Unknown satuan '${mat.satuan_normalized}' for ${mat.kode_perangkat}, using pcs`);
        mat.satuan_db_id = satuanMap['pcs'];
      }
      const barangId = await getOrCreateMaterial(mat, kategoriId, mat.satuan_db_id);
      if (barangId) {
        materialMap[mat.kode_perangkat] = barangId;
      }
    }
    console.log(`Materials: created=${stats.material.created}, updated=${stats.material.updated}, exists=${stats.material.exists}, skipped=${stats.material.skipped}`);

    // 4. CLUSTERS
    console.log('\n--- STEP 4: CLUSTERS ---');
    const clusterMap = {};
    for (const cl of extract.clusters) {
      clusterMap[cl.cluster_id] = await getOrCreateCluster(cl);
    }
    console.log(`Clusters: created=${stats.cluster.created}, updated=${stats.cluster.updated}, exists=${stats.cluster.exists}`);

    // 5. TIKET & BOQ per cluster
    console.log('\n--- STEP 5: TIKET & BOQ ---');
    const boqMap = {}; // cluster_id -> boq_id
    const tiketMap = {}; // cluster_id -> tiket_id
    
    for (const cl of extract.clusters) {
      let tiketCode = cl.no_tiket_release;
      let isPlaceholder = false;
      
      if (!tiketCode || tiketCode.trim() === '' || tiketCode.trim() === ' ') {
        // RW01 or empty
        tiketCode = 'TANPA-TIKET-RW01';
        isPlaceholder = true;
      } else if (tiketCode === 'UR11027' && cl.cluster_id === 'MF-H-000141') {
        // POP duplicate
        tiketCode = 'TANPA-TIKET-POP';
        isPlaceholder = true;
      }
      
      const tiketData = {
        kode_tiket: tiketCode,
        project_id: cl.project_id,
        cluster_id: cl.cluster_id,
        area: cl.nama_cluster.includes('RW') ? 'Bandung' : 'Baleendah'
      };
      
      const tiketId = await getOrCreateTiket(tiketData);
      tiketMap[cl.cluster_id] = tiketId;
      
      const boqId = await getOrCreateBoq(tiketId, cl.cluster_id);
      boqMap[cl.cluster_id] = boqId;
    }
    console.log(`Tiket: created=${stats.tiket.created}, exists=${stats.tiket.exists}, placeholder=${stats.tiket.placeholder}`);
    console.log(`BOQ: created=${stats.boq.created}, exists=${stats.boq.exists}`);

    // 6. BOQ ITEMS - group records by cluster
    console.log('\n--- STEP 6: BOQ ITEMS ---');
    const recordsByCluster = {};
    for (const rec of extract.records) {
      if (!recordsByCluster[rec.cluster_id]) recordsByCluster[rec.cluster_id] = [];
      recordsByCluster[rec.cluster_id].push(rec);
    }
    
    let totalItems = 0;
    for (const [clusterId, records] of Object.entries(recordsByCluster)) {
      const boqId = boqMap[clusterId];
      if (!boqId) {
        console.warn(`  WARNING: No BOQ for cluster ${clusterId}, skipping ${records.length} items`);
        stats.boq_item.skipped += records.length;
        continue;
      }
      
      const items = records.map(r => {
        const barangId = materialMap[r.kode_perangkat];
        let satuanId = satuanMap[r.satuan];
        // Fallback for 'batang' -> use 'unit' (since existing Tiang materials use unit)
        if (!satuanId && r.satuan === 'batang') {
          satuanId = satuanMap['unit'];
        }
        if (!satuanId) satuanId = satuanMap['pcs'];
        return { barang_id: barangId, qty_rencana: r.boq_plan, satuan_id: satuanId };
      }).filter(i => i.barang_id && i.qty_rencana > 0);
      
      totalItems += items.length;
      console.log(`  Cluster ${clusterId}: ${items.length} items`);
      await upsertBoqItems(boqId, clusterId, items);
    }
    console.log(`BOQ Items: created=${stats.boq_item.created}, updated=${stats.boq_item.updated}, exists=${stats.boq_item.exists}, skipped=${stats.boq_item.skipped}`);
    console.log(`Total items processed: ${totalItems}`);

    // 7. ADDITIONAL ADJUSTMENTS - aggregate per material across all clusters
    console.log('\n--- STEP 7: ADDITIONAL ADJUSTMENTS ---');
    const additionalAgg = {};
    for (const rec of extract.records) {
      if (rec.additional > 0) {
        if (!additionalAgg[rec.kode_perangkat]) additionalAgg[rec.kode_perangkat] = 0;
        additionalAgg[rec.kode_perangkat] += rec.additional;
      }
    }
    
    console.log('Aggregated additional per material:');
    for (const [kode, qty] of Object.entries(additionalAgg)) {
      const barangId = materialMap[kode];
      if (barangId) {
        await upsertAdditionalAdjustment(1, barangId, qty, `Import dari BoQ Rancamanyar (${kode})`);
        console.log(`  ${kode}: ${qty}`);
      } else {
        console.warn(`  WARNING: Material not found for additional: ${kode}`);
      }
    }
    console.log(`Additional: created=${stats.additional.created}, updated=${stats.additional.updated}, exists=${stats.additional.exists}`);

    // Summary
    console.log('\n=== DRY-RUN SUMMARY ===');
    console.log(`Satuan:        +${stats.satuan.created} created, ${stats.satuan.exists} existing`);
    console.log(`Materials:     +${stats.material.created} created, ${stats.material.updated} updated, ${stats.material.exists} existing`);
    console.log(`Clusters:      +${stats.cluster.created} created, ${stats.cluster.updated} updated, ${stats.cluster.exists} existing`);
    console.log(`Tiket:         +${stats.tiket.created} created (${stats.tiket.placeholder} placeholder), ${stats.tiket.exists} existing`);
    console.log(`BOQ:           +${stats.boq.created} created, ${stats.boq.exists} existing`);
    console.log(`BOQ Items:     +${stats.boq_item.created} created, ${stats.boq_item.updated} updated, ${stats.boq_item.exists} existing, ${stats.boq_item.skipped} skipped`);
    console.log(`Additional:    +${stats.additional.created} created, ${stats.additional.updated} updated, ${stats.additional.exists} existing`);
    
    if (stats.errors.length > 0) {
      console.log('\nERRORS:');
      stats.errors.forEach(e => console.log(' ', e));
    }

    // Record count per cluster
    console.log('\n--- RECORDS PER CLUSTER ---');
    for (const [clusterId, records] of Object.entries(recordsByCluster)) {
      const items = records.filter(r => r.boq_plan > 0 || r.additional > 0 || r.mos > 0 || r.used > 0);
      console.log(`  ${clusterId} (${extract.clusters.find(c => c.cluster_id === clusterId)?.nama_cluster}): ${items.length} records`);
    }
    console.log(`Total: ${totalItems} boq_item records`);

    // Target tables summary
    console.log('\n--- TARGET TABLES & COLUMNS ---');
    console.log('BoQ Plan     → boq_item.qty_rencana (per cluster via BOQ)');
    console.log('Additional   → additional_adjustment.qty (aggregate per material, project_id=1)');
    console.log('MOS          → NOT stored (computed from surat_jalan_item outbound)');
    console.log('Used         → NOT stored (computed from laporan_mitra.used)');
    console.log('Remains      → NOT stored (system computes: mos - (boq + additional))');
    console.log('');
    console.log('System computes Remains automatically via reconciliation.utils.computeRemains()');

    if (DRY_RUN) {
      console.log('\n>>> DRY-RUN COMPLETE. Run with --apply to execute. <<<');
    } else {
      console.log('\n>>> IMPORT COMPLETE <<<');
    }

  } catch (error) {
    console.error('ERROR:', error);
    stats.errors.push(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();