const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const boqItems = await prisma.boq_item.findMany({
    where: {
      boq_id: { in: [20, 21] },
    },
    select: {
      boq_item_id: true,
      boq_id: true,
      barang_id: true,
    },
  });

  console.log(`boq_item for BOQ 20/21: ${boqItems.length}`);
  for (const item of boqItems) {
    console.log(`  boq_item_id=${item.boq_item_id}, boq_id=${item.boq_id}, barang_id=${item.barang_id}`);
  }

  const totalBoqItem = await prisma.boq_item.count();
  console.log(`\nTotal boq_item: ${totalBoqItem}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
