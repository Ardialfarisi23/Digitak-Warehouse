const prisma = require("./src/config/prisma");

(async () => {
  const boqs = await prisma.boq.findMany({
    where: { status: { in: ["draft", "aktif", "selesai"] } },
    include: {
      tiket: { select: { project_id: true, kode_tiket: true } },
      items: { select: { barang_id: true, qty_rencana: true } },
    },
    take: 5,
  });

  for (const boq of boqs) {
    console.log("BOQ", boq.boq_id, "Project", boq.tiket?.project_id, "Tiket", boq.tiket?.kode_tiket);
    for (const item of boq.items) {
      console.log("  Barang", item.barang_id, "Qty", item.qty_rencana);
    }
  }

  await prisma.$disconnect();
})();
