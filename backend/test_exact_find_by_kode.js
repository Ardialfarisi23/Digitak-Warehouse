const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function safeStringify(obj) {
  return JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2);
}

async function test() {
  try {
    const first = await prisma.barang.findFirst();
    const kode = first?.kode_perangkat;
    console.log('Testing with kode:', kode);

    // Test the EXACT findByKode logic from item.repository.js
    const findByKode = async (kode_perangkat, options = {}) => {
      if (options.includeInactive) {
        return await prisma.barang.findUnique({
          where: { kode_perangkat },
        });
      }

      return await prisma.barang.findFirst({
        where: {
          kode_perangkat,
        },
      });
    };

    const result = await findByKode(kode, { includeInactive: true });
    console.log('findByKode result:', safeStringify(result));

    // Now test with explicit form
    const result2 = await prisma.barang.findUnique({
      where: { kode_perangkat: kode },
    });
    console.log('findUnique explicit:', safeStringify(result2));

    console.log('Both results are truthy:', !!result && !!result2);
    console.log('Both have same barang_id:', result?.barang_id === result2?.barang_id);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
