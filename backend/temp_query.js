const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const countBefore = await prisma.surat_jalan.count();
    console.log(`Jumlah surat_jalan sebelum migration: ${countBefore}`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
