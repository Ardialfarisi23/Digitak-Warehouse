const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Personnel' 
    ORDER BY ordinal_position
  `;
  console.log('Personnel columns:', columns.map(c => c.column_name));
  await prisma.$disconnect();
}

main();
