const prisma = require("./src/config/prisma");

(async () => {
  const boqs = await prisma.boq.findMany({
    where: { status: { in: ["draft", "aktif", "selesai"] } },
    include: {
      tiket: { select: { project_id: true, kode_tiket: true } },
      cluster: { select: { project_id: true, cluster_id: true } },
      items: { select: { barang_id: true } },
    },
  });

  for (const boq of boqs) {
    console.log("BOQ", boq.boq_id, "Tiket", boq.tiket?.kode_tiket, "TiketProject", boq.tiket?.project_id, "Cluster", boq.cluster?.cluster_id, "ClusterProject", boq.cluster?.project_id);
    for (const item of boq.items) {
      console.log("  Barang", item.barang_id);
    }
  }

  await prisma.$disconnect();
})();
