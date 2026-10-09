const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check tiket_material unique constraints and nullable fields
  const tiket = await prisma.tiket_material.findFirst();
  console.log('Sample tiket:', tiket);
  
  // Check BOQ unique on tiket_id
  const boq = await prisma.boq.findFirst();
  console.log('Sample boq:', boq);
  
  // Check additional_adjustment usage in reconciliation
  const adj = await prisma.additional_adjustment.findMany({ take: 3 });
  console.log('additional_adjustment sample:', adj);
  
  // Check satuan 'batang'
  const batang = await prisma.satuan.findUnique({ where: { kode_satuan: 'batang' } });
  console.log('Satuan batang:', batang);
  
  // Check cluster nullable fields
  const cl = await prisma.cluster.findFirst();
  console.log('Sample cluster:', cl);
  
  // Check if tiket_id in boq is unique and required
  const boqSchema = await prisma.$queryRaw`SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'boq' AND column_name = 'tiket_id'`;
  console.log('BOQ tiket_id column:', boqSchema);
}

check().finally(() => prisma.$disconnect());