const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const exists = await prisma.barang.findUnique({
      where: { barang_id: 58 },
      select: { barang_id: true, kode_perangkat: true },
    });
    console.log('barang_id=58 exists:', exists);

    const maxId = await prisma.barang.findFirst({
      orderBy: { barang_id: 'desc' },
      select: { barang_id: true },
    });
    console.log('Max barang_id:', maxId);

    const count = await prisma.barang.count();
    console.log('Total barang now:', count);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
