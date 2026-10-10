const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function bigIntReplacer(key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

async function main() {
  const notes = await prisma.$queryRaw`SELECT * FROM reconciliation_remains_note ORDER BY updated_at DESC LIMIT 10`;
  console.log(JSON.stringify(notes, bigIntReplacer, 2));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });