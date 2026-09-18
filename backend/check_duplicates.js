const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const duplicates = await prisma.$queryRaw`
      SELECT kode_perangkat, COUNT(*) as cnt
      FROM barang
      GROUP BY kode_perangkat
      HAVING COUNT(*) > 1
    `;
    console.log('DUPLICATE KODE_PERANGKAT:', JSON.stringify(duplicates, null, 2));

    const total = await prisma.barang.count();
    console.log('TOTAL BARANG:', total);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
