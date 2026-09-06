const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const targets = [
    { user_id: 5, nama: 'Budi Santoso', gudang_id: 1, gudang_nama: 'Gudang Rancamanyar' },
    { user_id: 6, nama: 'Rina Kartika', gudang_id: 2, gudang_nama: 'Gudang Ciamis' },
  ];
  const unassigned = [
    { user_id: 7, nama: 'Dedi Kurniawan' },
    { user_id: 2, nama: 'Supervisor Gudang (gmail)' },
  ];

  console.log('=== ASSIGN ===');
  for (const t of targets) {
    const personil = await prisma.personil.findFirst({ where: { user_id: BigInt(t.user_id) } });
    if (!personil) {
      console.log(`SKIP user_id=${t.user_id} (${t.nama}): personil tidak ditemukan`);
      continue;
    }
    await prisma.personil.update({
      where: { personil_id: personil.personil_id },
      data: { gudang_id: BigInt(t.gudang_id) },
    });
    console.log(`✓ user_id=${t.user_id} (${t.nama}) → gudang_id=${t.gudang_id} (${t.gudang_nama})`);
  }

  console.log('\n=== VERIFY ASSIGNED ===');
  for (const t of targets) {
    const p = await prisma.personil.findFirst({
      where: { user_id: BigInt(t.user_id) },
      include: { gudang: { select: { nama_gudang: true } } },
    });
    console.log(`user_id=${t.user_id} (${t.nama}): gudang_id=${p?.gudang_id ? String(p.gudang_id) : 'null'} (${p?.gudang?.nama_gudang || '-'})`);
  }

  console.log('\n=== VERIFY UNASSIGNED (should be null) ===');
  for (const t of unassigned) {
    const p = await prisma.personil.findFirst({ where: { user_id: BigInt(t.user_id) } });
    console.log(`user_id=${t.user_id} (${t.nama}): gudang_id=${p?.gudang_id == null ? 'null ✓' : String(p.gudang_id)}`);
  }

  await prisma.$disconnect();
})();