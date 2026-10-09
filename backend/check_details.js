const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check all materials with kode_perangkat starting with [01-
  const materials = await prisma.barang.findMany({
    where: { kode_perangkat: { startsWith: '[01-' } },
    select: { barang_id: true, kode_perangkat: true, nama_barang: true, satuan_default_id: true }
  });
  console.log('Existing [01- materials:', materials.length);
  materials.forEach(m => console.log(' ', m.kode_perangkat, '|', m.nama_barang, '| satuan:', m.satuan_default_id));
  
  // Check satuan
  const satuan = await prisma.satuan.findMany();
  console.log('\nSatuan:', satuan.map(s => s.kode_satuan).join(', '));
  
  // Check material [01-013-03725] specifically
  const m3725 = await prisma.barang.findUnique({ where: { kode_perangkat: '[01-013-03725' } });
  console.log('\nMaterial [01-013-03725]:', m3725);
  
  // Check if there are existing MOS/Used for the 13 clusters
  const clusters = ['NET-H-004396', 'NET-H-004397', 'NET-H-004938', 'NET-H-004399', 'NET-H-004400', 'NET-H-004401', 'NET-H-004402', 'NET-H-004404', 'NET-H-004405', 'NET-H-004406', 'NET-H-004409', 'NET-H-004410', 'MF-H-000141'];
  
  const tikets = await prisma.tiket_material.findMany({
    where: { cluster_id: { in: clusters } },
    select: { tiket_id: true, kode_tiket: true, cluster_id: true, mos: true, used: true }
  });
  console.log('\nExisting tikets for these clusters:', tikets.length);
  tikets.forEach(t => console.log(' ', t.kode_tiket, '|', t.cluster_id, '| MOS:', t.mos, '| Used:', t.used));
  
  // Check existing BOQ for these clusters
  const boqs = await prisma.boq.findMany({
    where: { cluster_id: { in: clusters } },
    select: { boq_id: true, boq_number: true, cluster_id: true, tiket_id: true, status: true }
  });
  console.log('\nExisting BOQs for these clusters:', boqs.length);
  boqs.forEach(b => console.log(' ', b.boq_number, '|', b.cluster_id, '| tiket:', b.tiket_id, '| status:', b.status));
}

check().finally(() => prisma.$disconnect());