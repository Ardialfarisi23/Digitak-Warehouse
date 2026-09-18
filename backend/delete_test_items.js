const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteItems() {
  try {
    const ids = [62, 63, 64];
    
    console.log('Deleting barang with IDs:', ids);
    
    const result = await prisma.barang.deleteMany({
      where: {
        barang_id: {
          in: ids
        }
      }
    });
    
    console.log('Deleted count:', result.count);
    
    const total = await prisma.barang.count();
    console.log('Total barang after delete:', total);
    
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

deleteItems();
