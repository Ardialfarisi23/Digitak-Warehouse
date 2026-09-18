const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const first = await prisma.barang.findFirst();
    const kode = first?.kode_perangkat;
    console.log('Testing duplicate for kode:', kode);

    try {
      await prisma.barang.create({
        data: {
          kode_perangkat: kode,
          nama_barang: 'TEST DUPLICATE',
          kategori_id: first.kategori_id,
          satuan_default_id: first.satuan_default_id,
          created_by: 1,
          updated_by: 1,
        },
      });
      console.log('BUG: Duplicate was created!');
    } catch (e) {
      console.log('DB correctly rejected duplicate. Code:', e.code);
      console.log('Message:', e.message);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
