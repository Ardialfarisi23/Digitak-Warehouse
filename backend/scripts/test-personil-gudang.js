const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gudang = await prisma.gudang.findFirst();
  if (!gudang) {
    console.log('No gudang found');
    return;
  }

  const personils = await prisma.personil.findMany({ take: 5 });
  console.log('Testing assigning same gudang to multiple personil...');
  console.log('Gudang:', gudang.nama_gudang, 'ID:', gudang.gudang_id);

  for (const p of personils) {
    await prisma.personil.update({
      where: { personil_id: p.personil_id },
      data: { gudang_id: gudang.gudang_id },
    });
    console.log(`Updated personil ${p.nama} (${p.personil_id}) with gudang_id ${gudang.gudang_id}`);
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
