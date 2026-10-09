const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const data = require('./data/boq_extract.json');

async function analyze() {
  // Get all existing barang
  const existing = await prisma.barang.findMany({
    select: { barang_id: true, kode_perangkat: true, nama_barang: true, satuan_default_id: true }
  });
  const satuan = await prisma.satuan.findMany();
  const satuanMap = new Map(satuan.map(s => [s.satuan_id, s.kode_satuan]));
  
  // Build lookup maps for flexible matching
  const byExact = new Map(existing.map(b => [b.kode_perangkat, b]));
  const byNoBracket = new Map(existing.map(b => [b.kode_perangkat.replace(/[\[\]]/g, ''), b]));
  const byName = new Map(existing.map(b => [b.nama_barang.toLowerCase().trim(), b]));
  
  console.log('=== SATUAN MISMATCH CLASSIFICATION ===\n');
  
  const mismatches = [];
  
  for (const mat of data.materials) {
    let db = byExact.get(mat.kode_perangkat);
    let matchType = 'exact';
    
    // Try without brackets
    if (!db) {
      const noBracket = mat.kode_perangkat.replace(/[\[\]]/g, '');
      db = byNoBracket.get(noBracket);
      if (db) matchType = 'no_bracket';
    }
    
    // Try name match (for In MSP)
    if (!db) {
      db = byName.get(mat.nama_barang.toLowerCase().trim());
      if (db) matchType = 'name';
    }
    
    if (db) {
      const dbSatuan = satuanMap.get(db.satuan_default_id);
      const excelSatuan = mat.satuan_normalized;
      
      if (dbSatuan !== excelSatuan) {
        // Calculate total BoQ Plan and count items
        const records = data.records.filter(r => r.kode_perangkat === mat.kode_perangkat);
        const totalBoq = records.reduce((sum, r) => sum + r.boq_plan, 0);
        const itemCount = records.filter(r => r.boq_plan > 0).length;
        
        mismatches.push({
          kode_excel: mat.kode_perangkat,
          kode_db: db.kode_perangkat,
          nama: mat.nama_barang,
          excel_satuan: excelSatuan,
          db_satuan: dbSatuan,
          total_boq_plan: totalBoq,
          boq_item_count: itemCount,
          match_type: matchType
        });
      }
    }
  }
  
  // Group A: same meaning (pcs/unit/units, batang->unit for Tiang)
  // Group B: different quantity meaning (pcs vs meter, meter vs roll, unit vs roll, unit vs box, batang vs meter)
  
  const groupA = [];
  const groupB = [];
  
  // Known Tiang codes (batang -> unit is same meaning)
  const tiangCodes = ['[01-013-13103]', '[01-013-13104]', '01-013-13101'];
  
  for (const m of mismatches) {
    const e = m.excel_satuan.toLowerCase();
    const d = m.db_satuan.toLowerCase();
    
    // Group A conditions
    const isTiang = tiangCodes.includes(m.kode_excel) || tiangCodes.includes(m.kode_db);
    const isPcsUnit = (e === 'pcs' && d === 'unit') || (e === 'unit' && d === 'pcs');
    const isBatangUnit = (e === 'batang' && d === 'unit') && isTiang;
    
    if (isPcsUnit || isBatangUnit) {
      groupA.push(m);
    } else {
      groupB.push(m);
    }
  }
  
  // Sort by total qty desc
  groupA.sort((a,b) => b.total_boq_plan - a.total_boq_plan);
  groupB.sort((a,b) => b.total_boq_plan - a.total_boq_plan);
  
  console.log('=== KELOMPOK A: HITUNGAN SAMA (pcs/unit/units, batang->unit Tiang) ===');
  console.log(`Total: ${groupA.length} material, ${groupA.reduce((s,m)=>s+m.boq_item_count,0)} BOQ items\n`);
  groupA.forEach(m => {
    console.log(`  ${m.kode_excel} → ${m.kode_db} | ${m.nama}`);
    console.log(`    Excel: ${m.excel_satuan} | DB: ${m.db_satuan} | BOQ items: ${m.boq_item_count} | Total qty: ${m.total_boq_plan}`);
  });
  
  console.log('\n=== KELOMPOK B: ARTI KUANTITAS BERBEDA ===');
  console.log(`Total: ${groupB.length} material, ${groupB.reduce((s,m)=>s+m.boq_item_count,0)} BOQ items\n`);
  groupB.forEach(m => {
    console.log(`  ${m.kode_excel} → ${m.kode_db} | ${m.nama}`);
    console.log(`    Excel: ${m.excel_satuan} | DB: ${m.db_satuan} | BOQ items: ${m.boq_item_count} | Total qty: ${m.total_boq_plan}`);
  });
  
  // === DETAIL CHECK FOR KABEL DROPCORE (Group B: pcs vs meter) ===
  console.log('\n\n=== DETAIL: KABEL DROPCORE (pcs vs meter) - EXISTING DATA CHECK ===');
  
  const kabelCodes = groupB
    .filter(m => m.nama.includes('KABEL DROPCORE') && m.excel_satuan === 'pcs' && m.db_satuan === 'meter')
    .map(m => m.kode_db);
  
  if (kabelCodes.length > 0) {
    // Get barang_ids for these codes
    const kabelBarang = await prisma.barang.findMany({
      where: { kode_perangkat: { in: kabelCodes } },
      select: { barang_id: true, kode_perangkat: true, nama_barang: true }
    });
    
    const barangIds = kabelBarang.map(b => b.barang_id);
    const kodeMap = new Map(kabelBarang.map(b => [b.barang_id, b.kode_perangkat]));
    
    // Check boq_item
    console.log('\n--- boq_item (existing) ---');
    const boqItems = await prisma.boq_item.findMany({
      where: { barang_id: { in: barangIds } },
      select: { barang_id: true, qty_rencana: true, satuan_id: true }
    });
    
    const satuanMap2 = new Map(satuan.map(s => [s.satuan_id, s.kode_satuan]));
    
    for (const b of kabelBarang) {
      const items = boqItems.filter(i => i.barang_id === b.barang_id);
      if (items.length > 0) {
        const qtys = items.map(i => Number(i.qty_rencana)).sort((a,b)=>a-b);
        const sat = satuanMap2.get(items[0].satuan_id);
        const min = qtys[0];
        const max = qtys[qtys.length-1];
        const median = qtys[Math.floor(qtys.length/2)];
        console.log(`  ${b.kode_perangkat} (${b.nama_barang}):`);
        console.log(`    Count: ${items.length} | Satuan: ${sat} | Min: ${min} | Median: ${median} | Max: ${max}`);
      } else {
        console.log(`  ${b.kode_perangkat} (${b.nama_barang}): NO boq_item data`);
      }
    }
    
    // Check surat_jalan_item (outbound, approved) - join via surat_jalan
    console.log('\n--- surat_jalan_item (outbound, approved) ---');
    const sjItems = await prisma.surat_jalan_item.findMany({
      where: {
        barang_id: { in: barangIds },
        surat_jalan: {
          tipe: 'outbound',
          tujuan_tipe: { not: 'gudang' },
          status: { in: ['disetujui', 'diterima_didistribusikan'] }
        }
      },
      select: { barang_id: true, qty: true, satuan_id: true }
    });
    
    for (const b of kabelBarang) {
      const items = sjItems.filter(i => i.barang_id === b.barang_id);
      if (items.length > 0) {
        const qtys = items.map(i => Number(i.qty)).sort((a,b)=>a-b);
        const sat = satuanMap2.get(items[0].satuan_id);
        const min = qtys[0];
        const max = qtys[qtys.length-1];
        const median = qtys[Math.floor(qtys.length/2)];
        console.log(`  ${b.kode_perangkat} (${b.nama_barang}):`);
        console.log(`    Count: ${items.length} | Satuan: ${sat} | Min: ${min} | Median: ${median} | Max: ${max}`);
      } else {
        console.log(`  ${b.kode_perangkat} (${b.nama_barang}): NO surat_jalan_item data`);
      }
    }
  }
  
  // Summary
  console.log('\n\n=== RINGKASAN ===');
  console.log(`Kelompok A: ${groupA.length} material, ${groupA.reduce((s,m)=>s+m.boq_item_count,0)} BOQ items`);
  console.log(`Kelompok B: ${groupB.length} material, ${groupB.reduce((s,m)=>s+m.boq_item_count,0)} BOQ items`);
  console.log(`TOTAL: ${groupA.length + groupB.length} material`);
  
  // Return data for progress file update
  return { groupA, groupB, mismatches };
}

analyze()
  .then(result => {
    console.log('\n=== JSON for progress file ===');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());