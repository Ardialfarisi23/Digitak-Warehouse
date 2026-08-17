const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gudang = await prisma.gudang.findFirst();
  if (!gudang) {
    console.log('No gudang found');
    return;
  }

  console.log('Testing user creation with gudang_id:', gudang.gudang_id.toString(), gudang.nama_gudang);

  const user = await prisma.user_account.create({
    data: {
      nama: 'Test User Gudang',
      email: `test.gudang.${Date.now()}@example.com`,
      password_hash: 'hashed',
      role: 'staf_gudang',
      is_aktif: true,
    },
  });

  const personil = await prisma.personil.create({
    data: {
      nama: user.nama,
      jenis: 'teknisi',
      no_hp: '081234567890',
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

  const result = await prisma.user_account.findUnique({
    where: { user_id: user.user_id },
    include: {
      personils: {
        select: {
          personil_id: true,
          nama: true,
          gudang_id: true,
          gudang: {
            select: {
              gudang_id: true,
              nama_gudang: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  const p = result.personils[0];
  console.log('Created user with gudang assignment:');
  console.log('User:', result.nama, result.email);
  console.log('Personil:', p.nama, 'ID:', p.personil_id.toString(), 'gudang_id:', p.gudang_id?.toString() || 'null');
  if (p.gudang) {
    console.log('Gudang:', p.gudang.nama_gudang, 'ID:', p.gudang.gudang_id.toString());
  }

  const count = await prisma.personil.count({
    where: { gudang_id: gudang.gudang_id },
  });
  console.log(`Total personil assigned to gudang ${gudang.nama_gudang}: ${count}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
