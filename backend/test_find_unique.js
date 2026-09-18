const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function safeStringify(obj) {
  return JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2);
}

async function test() {
  try {
    const first = await prisma.barang.findFirst();
    console.log('First barang:', safeStringify(first));

    if (first) {
      const kode = first.kode_perangkat;

      const result1 = await prisma.barang.findUnique({
        where: { kode_perangkat: kode },
      });
      console.log('findUnique explicit:', safeStringify(result1));

      const result2 = await prisma.barang.findUnique({
        where: { kode_perangkat },
      });
      console.log('findUnique shorthand:', safeStringify(result2));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
