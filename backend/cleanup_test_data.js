const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    // Delete the test BOQ items first
    const boqItems = await prisma.boq_item.findMany({
      where: { boq_id: 11 },
      select: { boq_item_id: true }
    });
    console.log('Found BOQ items to delete:', boqItems.length);
    
    for (const item of boqItems) {
      await prisma.boq_item.delete({
        where: { boq_item_id: item.boq_item_id }
      });
      console.log('Deleted boq_item:', item.boq_item_id);
    }

    // Delete the test BOQ
    await prisma.boq.delete({
      where: { boq_id: 11 }
    });
    console.log('Deleted BOQ 11');

    // Delete the test item
    await prisma.barang.delete({
      where: { barang_id: 69 }
    });
    console.log('Deleted barang 69');

    const totalBarang = await prisma.barang.count();
    console.log('Total barang after cleanup:', totalBarang);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
