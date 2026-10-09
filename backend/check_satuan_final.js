const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const data = require('./data/boq_extract.json');

async function check() {
  // Get all existing barang
  const existing = await prisma.barang.findMany({
    select: { barang_id: true, kode_perangkat: true, nama_barang: true, satuan_default_id: true }
  });
  const existingMap = new Map(existing.map(b => [b.kode_perangkat, b]));
  
  // Get satuan map
  const satuan = await prisma.satuan.findMany();
  const satuanMap = new Map(satuan.map(s => [s.satuan_id, s.kode_satuan]));
  
  console.log('=== SATUAN MISMATCH CHECK ===\n');
  
  let mismatches = [];
  let knownMismatches = 0;
  
  for (const mat of data.materials) {
    let db = existingMap.get(mat.kode_perangkat);
    
    // Try bracket fix for 03725
    if (!db && mat.kode_perangkat.includes('03725')) {
      const withBracket = mat.kode_perangkat.endsWith(']') ? mat.kode_perangkat : mat.kode_perangkat + ']';
      db = existingMap.get(withBracket);
    }
    
    // Try without brackets
    if (!db) {
      const noBracket = mat.kode_perangkat.replace(/[\[\]]/g, '');
      db = existingMap.get(noBracket);
    }
    
    if (db) {
      const dbSatuan = satuanMap.get(db.satuan_default_id);
      const excelSatuan = mat.satuan_normalized;
      
      if (dbSatuan !== excelSatuan) {
        // Calculate total BoQ Plan for this material
        const totalBoq = data.records
          .filter(r => r.kode_perangkat === mat.kode_perangkat)
          .reduce((sum, r) => sum + r.boq_plan, 0);
        
        mismatches.push({
          kode: mat.kode_perangkat,
          nama: mat.nama_barang,
          excel_satuan: excelSatuan,
          db_satuan: dbSatuan,
          total_boq_plan: totalBoq
        });
        
        // Check if it's one of the known 4
        const isKnown = 
          mat.kode_perangkat === '[01-013-13103' ||  // Tiang 7m
          mat.kode_perangkat === '[01-013-13104' ||  // Tiang 6m
          mat.kode_perangkat === '01-013-13101' ||    // Tiang 9m
          mat.kode_perangkat === 'CPT-00533';         // Pipa Pralon
        
        if (isKnown) knownMismatches++;
      }
    }
  }
  
  console.log(`Total mismatches: ${mismatches.length}`);
  console.log(`Known mismatches (Tiang 7m/6m/9m, Pipa Pralon): ${knownMismatches}\n`);
  
  mismatches.forEach(m => {
    const marker = (m.kode === '[01-013-13103' || m.kode === '[01-013-13104' || m.kode === '01-013-13101' || m.kode === 'CPT-00533') ? ' [KNOWN]' : ' ***UNEXPECTED***';
    console.log(`${marker}`);
    console.log(`  Kode: ${m.kode}`);
    console.log(`  Nama: ${m.nama}`);
    console.log(`  Excel satuan: ${m.excel_satuan}`);
    console.log(`  DB satuan:    ${m.db_satuan}`);
    console.log(`  Total BoQ Plan: ${m.total_boq_plan}`);
    console.log('');
  });
  
  if (mismatches.length > knownMismatches) {
    console.log('❌ ADA KETIDAKCOCOKAN LAINNYA! BERHENTI, JANGAN --apply');
    process.exit(1);
  } else if (mismatches.length === knownMismatches && knownMismatches === 4) {
    console.log('✅ Hanya 4 ketidakcocokan yang sudah diketahui. Bisa lanjut --apply.');
    console.log('\n⚠️  CATATAN: Pipa Pralon (CPT-00533) Excel=1 batang vs DB=meter — perlu cek manual.');
  } else {
    console.log('❌ JUMLAH MISMATCH TIDAK SESUAI. BERHENTI.');
    process.exit(1);
  }
}

check().finally(() => prisma.$disconnect());