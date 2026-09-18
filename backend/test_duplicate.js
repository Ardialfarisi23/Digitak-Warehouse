const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDuplicate() {
  try {
    const existing = await prisma.barang.findFirst();
    console.log('Existing kode:', existing?.kode_perangkat);

    if (existing) {
      try {
        const dup = await prisma.barang.create({
          data: {
            kode_perangkat: existing.kode_perangkat,
            nama_barang: 'DUPLICATE TEST',
            kategori_id: existing.kategori_id,
            satuan_default_id: existing.satuan_default_id,
            created_by: 1,
            updated_by: 1,
          },
        });
        console.log('DUPLICATE CREATED (BUG!):', dup.kode_perangkat);
      } catch (e) {
        console.log('DB correctly rejected duplicate:', e.code, e.message);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

testDuplicate();
