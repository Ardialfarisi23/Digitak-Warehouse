const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user_account.findMany({
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
    orderBy: { user_id: 'asc' },
  });

  console.log('Users with gudang assignment:');
  for (const u of users) {
    const p = u.personils[0];
    const gudangName = p?.gudang?.nama_gudang || 'None';
    console.log(`- ${u.nama} (${u.email}) -> ${gudangName}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
