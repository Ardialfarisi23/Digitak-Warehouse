const { getInventory } = require("./src/modules/reconciliation/reconciliation.repository");

async function debug() {
  const clusterMode = await getInventory({ groupBy: "cluster", projectId: "7" }, {});
  
  // Check barang 39
  const barang39 = clusterMode.data.filter(r => r.barang_id === "39");
  console.log("Barang 39 rows:", barang39.length);
  barang39.forEach(r => {
    console.log(`  cluster=${r.cluster_id}, mos=${r.mos}, additional=${r.additional}, attribution=${r.cluster_attribution}`);
  });

  // Check all rows for project 7
  console.log("\nAll project 7 rows:");
  clusterMode.data.forEach(r => {
    console.log(`  ${r.id}: mos=${r.mos}, additional=${r.additional}, attribution=${r.cluster_attribution}`);
  });
}

debug().catch(console.error);
