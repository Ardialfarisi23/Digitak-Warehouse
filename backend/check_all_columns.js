const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = ['Project', 'Warehouse', 'Vehicle', 'Item', 'boqs', 'boq_items', 'permintaan_boqs'];
  
  for (const table of tables) {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = ${table} 
      ORDER BY ordinal_position
    `;
    console.log(`\n${table} columns:`, columns.map(c => c.column_name));
  }
  
  await prisma.$disconnect();
}

main();
