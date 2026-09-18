const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const item = await prisma.barang.findFirst({
      where: { barang_id: 2 },
      select: { barang_id: true, kode_perangkat: true },
    });
    console.log('Item with barang_id=2:', item);

    // Also check with string
    const item2 = await prisma.barang.findFirst({
      where: { barang_id: '2' },
      select: { barang_id: true, kode_perangkat: true },
    });
    console.log('Item with barang_id="2":', item2);

    // Get first item
    const first = await prisma.barang.findFirst({
      select: { barang_id: true, kode_perangkat: true },
    });
    console.log('First item:', first);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
