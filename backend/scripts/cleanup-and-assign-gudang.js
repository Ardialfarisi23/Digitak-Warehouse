const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Cleaning up test data ===');

  const allPersonils = await prisma.personil.findMany({
    select: { personil_id: true, nama: true, user_id: true },
    orderBy: { personil_id: 'asc' },
  });

  const testPersonils = allPersonils.filter(p => {
    const lower = p.nama.toLowerCase();
    return lower.includes('test') || lower.includes('testing');
  });

  for (const p of testPersonils) {
    await prisma.personil.delete({ where: { personil_id: p.personil_id } });
    console.log(`Deleted personil ${p.personil_id} (${p.nama})`);

    if (p.user_id) {
      await prisma.user_account.delete({ where: { user_id: p.user_id } });
      console.log(`Deleted user ${p.user_id}`);
    }
  }

  console.log('=== Assigning 15 personils to 2 gudang ===');

  const gudang1 = await prisma.gudang.findFirst({ where: { nama_gudang: 'Gudang Rancamanyar' } });
  const gudang2 = await prisma.gudang.findFirst({ where: { nama_gudang: 'Gudang Ciamis' } });

  console.log('Gudang 1:', gudang1.nama_gudang, 'ID:', gudang1.gudang_id.toString());
  console.log('Gudang 2:', gudang2.nama_gudang, 'ID:', gudang2.gudang_id.toString());

  const remainingPersonils = await prisma.personil.findMany({
    select: { personil_id: true, nama: true },
    orderBy: { personil_id: 'asc' },
  });

  console.log('Total real personils:', remainingPersonils.length);

  for (let i = 0; i < remainingPersonils.length; i++) {
    const gudang = i < 8 ? gudang1 : gudang2;
    await prisma.personil.update({
      where: { personil_id: remainingPersonils[i].personil_id },
      data: { gudang_id: gudang.gudang_id },
    });
    console.log(`Assigned ${remainingPersonils[i].nama} to ${gudang.nama_gudang}`);
  }

  const count1 = await prisma.personil.count({ where: { gudang_id: gudang1.gudang_id } });
  const count2 = await prisma.personil.count({ where: { gudang_id: gudang2.gudang_id } });
  console.log(`\nFinal count:`);
  console.log(`- ${gudang1.nama_gudang}: ${count1} personil`);
  console.log(`- ${gudang2.nama_gudang}: ${count2} personil`);
  console.log(`- Total: ${count1 + count2} personil`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
