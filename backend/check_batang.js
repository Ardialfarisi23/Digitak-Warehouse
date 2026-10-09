const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check the 4 Batang materials in DB
  const codes = ['[01-013-13103]', '[01-013-13104]', '01-013-13101', 'CPT-00533'];
  for (const code of codes) {
    const m = await prisma.barang.findUnique({ where: { kode_perangkat: code } });
    if (m) {
      const satuan = await prisma.satuan.findUnique({ where: { satuan_id: m.satuan_default_id } });
      console.log(code, '|', m.nama_barang, '| satuan:', satuan?.kode_satuan);
    } else {
      // Try without brackets
      const noBracket = code.replace(/[\[\]]/g, '');
      const m2 = await prisma.barang.findUnique({ where: { kode_perangkat: noBracket } });
      if (m2) {
        const satuan = await prisma.satuan.findUnique({ where: { satuan_id: m2.satuan_default_id } });
        console.log(code, '->', noBracket, '|', m2.nama_barang, '| satuan:', satuan?.kode_satuan);
      } else {
        console.log(code, '| NOT FOUND');
      }
    }
  }
  
  // Check [01-013-03725] with and without brackets
  const m3725 = await prisma.barang.findUnique({ where: { kode_perangkat: '[01-013-03725' } });
  console.log('\n[01-013-03725] (no close bracket):', m3725);
  const m3725b = await prisma.barang.findUnique({ where: { kode_perangkat: '[01-013-03725]' } });
  console.log('[01-013-03725] (with close bracket):', m3725b);
}

check().finally(() => prisma.$disconnect());