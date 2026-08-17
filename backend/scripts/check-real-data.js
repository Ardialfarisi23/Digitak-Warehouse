const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gudangs = await prisma.gudang.findMany({
    select: { gudang_id: true, nama_gudang: true, tipe: true },
  });
  console.log('Gudang list:', gudangs);

  const allPersonils = await prisma.personil.findMany({
    select: { personil_id: true, nama: true, gudang_id: true },
    take: 20,
  });
  console.log('Sample personils:', allPersonils);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
