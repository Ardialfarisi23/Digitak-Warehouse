const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const auditCount = await prisma.$queryRaw`SELECT COUNT(*) FROM audit_log`;
  const stokCount = await prisma.$queryRaw`SELECT COUNT(*) FROM stok_ledger`;
  console.log('audit_log count:', auditCount);
  console.log('stok_ledger count:', stokCount);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
