const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImportValues() {
  const boqItems = await prisma.boq_item.findMany({
    where: {
      boq: {
        status: { in: ['draft', 'aktif', 'selesai'] },
        source: 'top_down',
        cluster: { project_id: 17 },
      },
    },
    select: {
      boq_item_id: true,
      qty_rencana: true,
      qty_additional: true,
      qty_mos: true,
      qty_used: true,
      barang_id: true,
      boq: {
        select: {
          cluster_id: true,
        },
      },
    },
  });

  const byCluster = new Map();
  for (const item of boqItems) {
    const cid = item.boq?.cluster_id;
    if (!cid) continue;
    const key = `${cid}-${item.barang_id}`;
    if (!byCluster.has(key)) {
      byCluster.set(key, { additional: 0, mos: 0, used: 0, boq: 0 });
    }
    const agg = byCluster.get(key);
    agg.additional += Number(item.qty_additional || 0);
    agg.mos += Number(item.qty_mos || 0);
    agg.used += Number(item.qty_used || 0);
    agg.boq += Number(item.qty_rencana || 0);
  }

  console.log('Import values by cluster-barang:');
  for (const [key, val] of byCluster.entries()) {
    if (val.additional > 0 || val.mos > 0 || val.used > 0) {
      console.log(`  ${key}: BoQ=${val.boq}, Additional=${val.additional}, MOS=${val.mos}, Used=${val.used}`);
    }
  }

  // Check specific clusters
  const clusters = ['NET-H-004396', 'NET-H-004405', 'NET-H-004409', 'MF-H-000141'];
  for (const cid of clusters) {
    const items = boqItems.filter(i => i.boq?.cluster_id === cid);
    let totalAdditional = 0, totalMos = 0, totalUsed = 0, totalBoq = 0;
    for (const item of items) {
      totalAdditional += Number(item.qty_additional || 0);
      totalMos += Number(item.qty_mos || 0);
      totalUsed += Number(item.qty_used || 0);
      totalBoq += Number(item.qty_rencana || 0);
    }
    console.log(`\nCluster ${cid}: BoQ=${totalBoq}, Additional=${totalAdditional}, MOS=${totalMos}, Used=${totalUsed}`);
  }
}

checkImportValues().finally(() => prisma.$disconnect());