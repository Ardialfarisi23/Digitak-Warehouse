const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function executeRaw(sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate') || error.message.includes('already')) {
      console.log(`  (already exists, skipping)`);
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log('Adding new columns for reports v4.5...');

  await executeRaw(`ALTER TABLE tiket_material ADD COLUMN IF NOT EXISTS mos NUMERIC(14,2)`);
  await executeRaw(`ALTER TABLE tiket_material ADD COLUMN IF NOT EXISTS used NUMERIC(14,2)`);
  await executeRaw(`ALTER TABLE zona_gudang ADD COLUMN IF NOT EXISTS utilisasi_persen INTEGER`);

  console.log('Columns added successfully!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
