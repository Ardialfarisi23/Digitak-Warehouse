const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const testPersonils = await prisma.personil.findMany({
    where: {
      OR: [
        { nama: { contains: 'test', mode: 'insensitive' } },
        { nama: { contains: 'testing', mode: 'insensitive' } },
      ],
    },
    select: { personil_id: true, nama: true, user_id: true },
  });

  console.log('Test personils:', testPersonils);

  const testUsers = await prisma.user_account.findMany({
    where: {
      OR: [
        { nama: { contains: 'test', mode: 'insensitive' } },
        { nama: { contains: 'testing', mode: 'insensitive' } },
      ],
    },
    select: { user_id: true, nama: true, email: true },
  });

  console.log('Test users:', testUsers);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
