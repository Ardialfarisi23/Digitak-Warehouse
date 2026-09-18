const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const indexes = await prisma.$queryRaw`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'barang';`;
    console.log('INDEXES:', JSON.stringify(indexes, null, 2));

    const constraints = await prisma.$queryRaw`SELECT conname, contype FROM pg_constraint WHERE conrelid = 'barang'::regclass AND contype = 'u';`;
    console.log('UNIQUE CONSTRAINTS:', JSON.stringify(constraints, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
