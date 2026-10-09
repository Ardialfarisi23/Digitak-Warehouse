const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // 1. Check 4 Batang materials satuan in DB
  console.log('=== 4 Batang Materials in DB ===');
  const codes = ['[01-013-13103]', '[01-013-13104]', '01-013-13101', 'CPT-00533'];
  for (const code of codes) {
    const m = await prisma.barang.findUnique({ where: { kode_perangkat: code } });
    if (m) {
      const satuan = await prisma.satuan.findUnique({ where: { satuan_id: m.satuan_default_id } });
      console.log('  ', code, '| satuan:', satuan?.kode_satuan, '| nama:', m.nama_barang);
    } else {
      console.log('  ', code, '| NOT FOUND');
    }
  }
  
  // 2. Check [01-013-03725] in DB
  console.log('\n=== [01-013-03725] in DB ===');
  const m3725 = await prisma.barang.findUnique({ where: { kode_perangkat: '[01-013-03725]' } });
  console.log('  With close bracket:', m3725 ? 'EXISTS' : 'NOT FOUND');
  const m3725b = await prisma.barang.findUnique({ where: { kode_perangkat: '[01-013-03725' } });
  console.log('  Without close bracket:', m3725b ? 'EXISTS' : 'NOT FOUND');
  
  // 3. Check if any record references 03725 with boq_plan > 0
  const data = require('./data/boq_extract.json');
  const recs03725 = data.records.filter(r => r.kode_perangkat.includes('03725') && r.boq_plan > 0);
  console.log('\nRecords for 03725 with boq_plan > 0:', recs03725.length);
  
  // 4. Check reconciliation MOS source
  console.log('\n=== Reconciliation MOS Source ===');
  const mosItems = await prisma.surat_jalan_item.findMany({
    where: {
      surat_jalan: {
        tipe: 'outbound',
        tujuan_tipe: { not: 'gudang' },
        status: { in: ['disetujui', 'diterima_didistribusikan'] },
        project_id: 1
      }
    },
    take: 5,
    select: { item_id: true, barang_id: true, qty: true, surat_jalan: { select: { project_id: true, cluster_id: true, tipe: true } } }
  });
  console.log('Sample MOS items (outbound, project=1):', mosItems.length);
  mosItems.forEach(m => console.log('  ', m.barang_id, 'qty:', m.qty, 'sj:', m.surat_jalan));
  
  // 5. Check existing tiket_material for 13 clusters
  const clusters = ['NET-H-004396', 'NET-H-004397', 'NET-H-004938', 'NET-H-004399', 'NET-H-004400', 'NET-H-004401', 'NET-H-004402', 'NET-H-004404', 'NET-H-004405', 'NET-H-004406', 'NET-H-004409', 'NET-H-004410', 'MF-H-000141'];
  const tikets = await prisma.tiket_material.findMany({
    where: { cluster_id: { in: clusters } },
    select: { tiket_id: true, kode_tiket: true, cluster_id: true, mos: true, used: true }
  });
  console.log('\nExisting tikets for 13 clusters:', tikets.length);
  tikets.forEach(t => console.log('  ', t.kode_tiket, '|', t.cluster_id, '| MOS:', t.mos, '| Used:', t.used));
  
  // 6. Check DB URL
  console.log('\n=== Database URL ===');
  const url = process.env.DATABASE_URL || 'not set';
  console.log('DATABASE_URL:', url.replace(/:[^:@]*@/, ':****@'));
}

check().finally(() => prisma.$disconnect());