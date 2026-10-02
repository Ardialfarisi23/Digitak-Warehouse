const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const activeBoqs = await prisma.boq.findMany({
    where: { status: 'aktif' },
    include: {
      tiket: {
        include: {
          project: {
            select: { cluster_id: true, nama_project: true }
          }
        }
      }
    }
  });

  console.log('Active BOQs and their clusters:');
  for (const boq of activeBoqs) {
    console.log(`  BOQ ${boq.boq_id} (${boq.boq_number}): cluster=${boq.tiket?.project?.cluster_id || 'N/A'}, project=${boq.tiket?.project?.nama_project || 'N/A'}`);
  }

  const allClusters = await prisma.cluster.findMany({
    select: { cluster_id: true, nama_cluster: true }
  });

  const usedClusters = new Set(activeBoqs.map(b => b.tiket?.project?.cluster_id).filter(Boolean));
  const unusedClusters = allClusters.filter(c => !usedClusters.has(c.cluster_id));

  console.log('\nClusters without active BOQ:');
  for (const c of unusedClusters) {
    console.log(`  ${c.cluster_id}: ${c.nama_cluster}`);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
