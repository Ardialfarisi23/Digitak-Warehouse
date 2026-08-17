const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.$queryRaw`SELECT COUNT(*) FROM user_account`;
  const barangCount = await prisma.$queryRaw`SELECT COUNT(*) FROM barang`;
  const suratJalanCount = await prisma.$queryRaw`SELECT COUNT(*) FROM surat_jalan`;
  const suratJalanItemCount = await prisma.$queryRaw`SELECT COUNT(*) FROM surat_jalan_item`;
  console.log('user_account count:', userCount);
  console.log('barang count:', barangCount);
  console.log('surat_jalan count:', suratJalanCount);
  console.log('surat_jalan_item count:', suratJalanItemCount);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
