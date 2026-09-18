const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
  try {
    // Check all barang with IDs around our test range
    console.log('=== Checking barang 65-70 ===');
    for (let id = 65; id <= 70; id++) {
      const item = await prisma.barang.findUnique({
        where: { barang_id: id },
        select: { barang_id: true, kode_perangkat: true, nama_barang: true, created_at: true }
      });
      console.log(`barang_id=${id}:`, item || 'DELETED');
    }

    // Also check if there are any items we might have missed
    console.log('\n=== Recent barang (last 10 by ID) ===');
    const recent = await prisma.barang.findMany({
      take: 10,
      orderBy: { barang_id: 'desc' },
      select: { barang_id: true, kode_perangkat: true, nama_barang: true, created_at: true }
    });
    recent.forEach(item => {
      console.log(`barang_id=${item.barang_id}, kode="${item.kode_perangkat}", nama="${item.nama_barang}", created_at=${item.created_at}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

investigate();
