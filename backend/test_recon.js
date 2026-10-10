const { PrismaClient } = require('@prisma/client');
const reconciliationRepository = require('./src/modules/reconciliation/reconciliation.repository');

const prisma = new PrismaClient();

async function testReconciliation() {
  console.log("Testing reconciliation with import values...\n");
  
  try {
    // Test with groupBy=cluster, no filter
    const result = await reconciliationRepository.getInventory({ groupBy: "cluster" }, { id: 1, role: "admin" });
    console.log("groupBy=cluster, no filter:");
    console.log("  Items:", result.data?.length || 0);
    
    // Check specific clusters
    const clusters = ['NET-H-004396', 'NET-H-004405', 'NET-H-004409', 'MF-H-000141'];
    for (const cid of clusters) {
      const items = result.data.filter(d => d.cluster_id === cid);
      if (items.length > 0) {
        const totalBoq = items.reduce((s, d) => s + (d.boq || 0), 0);
        const totalAdditional = items.reduce((s, d) => s + (d.additional || 0), 0);
        const totalMos = items.reduce((s, d) => s + (d.mos || 0), 0);
        const totalUsed = items.reduce((s, d) => s + (d.used || 0), 0);
        const totalRemains = items.reduce((s, d) => s + (d.remains || 0), 0);
        const perhatian = items.filter(d => d.status === 'perhatian').length;
        console.log(`  ${cid}: BoQ=${totalBoq}, Additional=${totalAdditional}, MOS=${totalMos}, Used=${totalUsed}, Remains=${totalRemains}, Perhatian=${perhatian}/${items.length}`);
      }
    }
    
    // Count total Perhatian
    const totalPerhatian = result.data.filter(d => d.status === 'perhatian').length;
    console.log(`\nTotal Perhatian: ${totalPerhatian} (was 389)`);
    console.log(`Total items: ${result.data.length} (should be 418)`);
    
  } catch (err) {
    console.log("ERROR:", err.message);
    console.log(err.stack);
  }

  await prisma.$disconnect();
}

testReconciliation().catch(console.error);