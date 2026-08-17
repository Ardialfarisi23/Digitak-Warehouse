const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gudang = await prisma.gudang.findFirst();
  if (!gudang) {
    console.log('No gudang found');
    return;
  }

  console.log('Testing multiple personil assignment to gudang:', gudang.nama_gudang, 'ID:', gudang.gudang_id.toString());

  // Create 5 test users with same gudang
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user_account.create({
      data: {
        nama: `Test User ${i}`,
        email: `test.user.${i}.${Date.now()}@example.com`,
        password_hash: 'hashed',
        role: 'staf_gudang',
        is_aktif: true,
      },
    });

    const personil = await prisma.personil.create({
      data: {
        nama: user.nama,
        jenis: 'teknisi',
        no_hp: `081234567890${i}`,
        posisi: 'Staff Gudang',
        email: user.email,
        user_id: user.user_id,
        gudang_id: gudang.gudang_id,
        created_by: user.user_id,
        updated_by: user.user_id,
      },
    });

    await prisma.gudang.update({
      where: { gudang_id: gudang.gudang_id },
      data: { pic_id: personil.personil_id },
    });

    console.log(`Created user ${i}: ${user.nama}, personil_id: ${personil.personil_id.toString()}, gudang_id: ${personil.gudang_id?.toString() || 'null'}`);
  }

  const count = await prisma.personil.count({
    where: { gudang_id: gudang.gudang_id },
  });
  console.log(`\nTotal personil assigned to gudang ${gudang.nama_gudang}: ${count}`);

  const allPersonils = await prisma.personil.findMany({
    where: { gudang_id: gudang.gudang_id },
    select: { personil_id: true, nama: true, gudang_id: true },
  });

  console.log('\nAll personils with this gudang:');
  for (const p of allPersonils) {
    console.log(`- ${p.nama} (ID: ${p.personil_id.toString()}, gudang_id: ${p.gudang_id?.toString() || 'null'})`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
