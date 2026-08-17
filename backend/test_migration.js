const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting safe schema migration...');
  
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection OK');
    
    // Check current tables
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('Current tables:', tables.map(t => t.table_name));
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
