const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const personils = await prisma.personil.findMany({
    select: { personil_id: true, nama: true, gudang_id: true },
    orderBy: { personil_id: 'asc' },
  });

  console.log('All personils with gudang assignment:');
  for (const p of personils) {
    const gudangName = p.gudang_id ? `Gudang ID: ${p.gudang_id.toString()}` : 'None';
    console.log(`- ${p.nama} (ID: ${p.personil_id.toString()}) -> ${gudangName}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
