const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check tiket_material required fields
  const tiket = await prisma.tiket_material.findFirst({
    include: { boq: true }
  });
  console.log('tiket_material sample:', JSON.stringify(tiket, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
  
  // Check if BOQ can have multiple clusters via boq_item.cluster_id
  const boqItems = await prisma.boq_item.findMany({
    where: { cluster_id: { not: null } },
    take: 5,
    include: { boq: { select: { cluster_id: true } } }
  });
  console.log('\nboq_item with cluster_id:', boqItems.map(i => ({ 
    boq_item_id: i.boq_item_id, 
    boq_cluster: i.boq?.cluster_id, 
    item_cluster: i.cluster_id 
  })));
  
  // Check additional_adjustment usage in reconciliation
  const adj = await prisma.additional_adjustment.findMany({ take: 3 });
  console.log('\nadditional_adjustment sample:', adj);
  
  // Check tiket_material schema - what fields are required
  const tiketSchema = await prisma.$queryRaw`
    SELECT column_name, is_nullable, data_type, column_default
    FROM information_schema.columns 
    WHERE table_name = 'tiket_material'
    ORDER BY ordinal_position
  `;
  console.log('\ntiket_material columns:', tiketSchema);
  
  // Check boq.tiket_id unique constraint
  const boqSchema = await prisma.$queryRaw`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns 
    WHERE table_name = 'boq'
    ORDER BY ordinal_position
  `;
  console.log('\nboq columns:', boqSchema);
}

check().finally(() => prisma.$disconnect());