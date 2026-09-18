const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const total = await prisma.barang.count();
    console.log('Total barang:', total);
    
    // Check if test item still exists
    const testItem = await prisma.barang.findFirst({
      where: { kode_perangkat: 'DELETE-BLOCKED-001' },
      select: { barang_id: true, kode_perangkat: true }
    });
    console.log('Test item exists:', testItem);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
