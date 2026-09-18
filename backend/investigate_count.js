const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
  try {
    // 1. Check if barang_id=70 exists
    console.log('=== 1. Check barang_id=70 ===');
    const item70 = await prisma.barang.findUnique({
      where: { barang_id: 70 },
      select: { barang_id: true, kode_perangkat: true, nama_barang: true, created_at: true }
    });
    console.log('barang_id=70:', item70);

    // 2. Get ALL barang created today
    console.log('\n=== 2. All barang created today ===');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayItems = await prisma.barang.findMany({
      where: {
        created_at: {
          gte: today
        }
      },
      select: {
        barang_id: true,
        kode_perangkat: true,
        nama_barang: true,
        created_at: true,
        updated_at: true
      },
      orderBy: { barang_id: 'asc' }
    });
    
    console.log(`Total items created today: ${todayItems.length}`);
    todayItems.forEach(item => {
      console.log(`  barang_id=${item.barang_id}, kode="${item.kode_perangkat}", nama="${item.nama_barang}", created_at=${item.created_at}`);
    });

    // 3. Count all barang
    console.log('\n=== 3. Total barang count ===');
    const total = await prisma.barang.count();
    console.log('Total barang:', total);

    // 4. Check for any test items with common test patterns
    console.log('\n=== 4. Check test pattern items ===');
    const testPatterns = ['TEST-', 'DELETE-', 'PRK-', 'UPDATE-TEST-'];
    for (const pattern of testPatterns) {
      const items = await prisma.barang.findMany({
        where: {
          kode_perangkat: {
            startsWith: pattern
          }
        },
        select: { barang_id: true, kode_perangkat: true, nama_barang: true }
      });
      if (items.length > 0) {
        console.log(`\nPattern "${pattern}":`);
        items.forEach(item => {
          console.log(`  barang_id=${item.barang_id}, kode="${item.kode_perangkat}", nama="${item.nama_barang}"`);
        });
      }
    }

    // 5. Check specific IDs we know about
    console.log('\n=== 5. Check specific IDs ===');
    const specificIds = [58, 59, 62, 63, 64, 65, 66, 67, 68, 69, 70];
    for (const id of specificIds) {
      const item = await prisma.barang.findUnique({
        where: { barang_id: id },
        select: { barang_id: true, kode_perangkat: true, nama_barang: true }
      });
      console.log(`barang_id=${id}:`, item ? `EXISTS (kode="${item.kode_perangkat}")` : 'DELETED');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

investigate();
