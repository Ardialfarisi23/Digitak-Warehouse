const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const testCodes = ['[01-013-00010]', 'NWK-00468', 'CBL-00043', 'In MSP'];

    for (const kode of testCodes) {
      const result = await prisma.barang.findUnique({
        where: { kode_perangkat: kode },
      });
      console.log(`findUnique("${kode}"):`, result ? 'FOUND' : 'NOT FOUND');

      // Also test the shorthand used in the repository
      const findByKode = async (kode_perangkat, options = {}) => {
        if (options.includeInactive) {
          return await prisma.barang.findUnique({
            where: { kode_perangkat },
          });
        }
        return await prisma.barang.findFirst({
          where: { kode_perangkat },
        });
      };

      const result2 = await findByKode(kode, { includeInactive: true });
      console.log(`findByKode("${kode}"):`, result2 ? 'FOUND' : 'NOT FOUND');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
