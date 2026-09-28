const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CLEANUP TEST DATA ===\n');

  const testTicket = await prisma.tiket_material.findFirst({
    where: { kode_tiket: { startsWith: 'TKT-TEST-CLUSTER-' } },
    select: { tiket_id: true, kode_tiket: true },
  });

  if (!testTicket) {
    console.log('No test data found.');
    await prisma.$disconnect();
    return;
  }

  const boq = await prisma.boq.findFirst({
    where: { tiket_id: testTicket.tiket_id },
    select: { boq_id: true, status: true },
  });

  if (boq) {
    if (boq.status === 'draft') {
      await prisma.boq.delete({ where: { boq_id: boq.boq_id } });
      console.log(`✓ Deleted BOQ ${boq.boq_id}`);
    } else {
      await prisma.boq.update({
        where: { boq_id: boq.boq_id },
        data: { status: 'ditolak' },
      });
      console.log(`✓ Soft-deleted BOQ ${boq.boq_id} (status -> ditolak)`);
    }
  }

  await prisma.tiket_material.delete({
    where: { tiket_id: testTicket.tiket_id },
  });
  console.log(`✓ Deleted tiket_material ${testTicket.tiket_id} (${testTicket.kode_tiket})`);

  const finalBoqCount = await prisma.boq.count();
  console.log(`\nFinal BOQ count: ${finalBoqCount} (expected: 13)`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Cleanup failed:', e);
  process.exit(1);
});
