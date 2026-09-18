const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const total = await prisma.barang.count();
    console.log('Total barang:', total);
    
    // List all test items that might remain
    const testItems = await prisma.barang.findMany({
      where: {
        kode_perangkat: {
          startsWith: 'TEST-'
        }
      },
      select: { barang_id: true, kode_perangkat: true }
    });
    console.log('Remaining test items:', testItems);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
