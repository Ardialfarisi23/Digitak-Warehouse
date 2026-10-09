const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const data = require('./data/boq_extract.json');

async function check() {
  // Get all existing barang
  const existing = await prisma.barang.findMany({
    select: { barang_id: true, kode_perangkat: true, nama_barang: true }
  });
  const existingMap = new Map(existing.map(b => [b.kode_perangkat, b]));
  
  console.log('Total existing barang:', existing.length);
  
  // Check each extract material against DB
  let matched = 0, matchedByName = 0, unmatched = 0;
  for (const mat of data.materials) {
    let db = existingMap.get(mat.kode_perangkat);
    if (db) {
      matched++;
      if (db.nama_barang.trim() !== mat.nama_barang.trim()) {
        console.log('  NAME MISMATCH:', mat.kode_perangkat);
        console.log('    Excel:', mat.nama_barang);
        console.log('    DB:   ', db.nama_barang);
      }
    } else {
      // Try without brackets
      const noBracket = mat.kode_perangkat.replace(/[\[\]]/g, '');
      db = existingMap.get(noBracket);
      if (db) {
        matched++;
        console.log('  MATCHED without brackets:', mat.kode_perangkat, '->', db.kode_perangkat);
      } else {
        // Try by name
        const byName = existing.find(b => b.nama_barang.trim() === mat.nama_barang.trim());
        if (byName) {
          matchedByName++;
          console.log('  MATCHED by NAME:', mat.kode_perangkat, '->', byName.kode_perangkat);
        } else {
          unmatched++;
        }
      }
    }
  }
  console.log('\nSummary:');
  console.log('  Exact code match:', matched);
  console.log('  Matched by name only:', matchedByName);
  console.log('  Unmatched (new):', unmatched);
  
  // List unmatched
  console.log('\nUnmatched materials (to be created):');
  for (const mat of data.materials) {
    let db = existingMap.get(mat.kode_perangkat);
    if (!db) {
      const noBracket = mat.kode_perangkat.replace(/[\[\]]/g, '');
      db = existingMap.get(noBracket);
    }
    if (!db) {
      const byName = existing.find(b => b.nama_barang.trim() === mat.nama_barang.trim());
      if (!byName) {
        console.log('  ', mat.kode_perangkat, '|', mat.nama_barang, '|', mat.satuan_normalized);
      }
    }
  }
}

check().finally(() => prisma.$disconnect());