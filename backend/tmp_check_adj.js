const prisma = require("./src/config/prisma");

(async () => {
  const adj = await prisma.additional_adjustment.findMany({
    where: { project_id: 1n, barang_id: 25n },
    select: { adjustment_id: true, qty: true, alasan: true, created_at: true },
  });
  console.log("Existing adjustments for Project 1, Barang 25:");
  for (const a of adj) {
    console.log(" ", a.adjustment_id, a.qty, a.alasan, a.created_at);
  }
  if (adj.length === 0) {
    console.log("  (none)");
  }

  const kelebihan = await prisma.surat_jalan_item.findMany({
    where: {
      is_kelebihan: true,
      surat_jalan: {
        tipe: "inbound",
        status: { in: ["disetujui", "diterima_didistribusikan"] },
        project_id: 1n,
      },
      barang_id: 25n,
    },
    select: { qty: true, surat_jalan: { select: { project_id: true } } },
  });
  console.log("Kelebihan for Project 1, Barang 25:");
  for (const k of kelebihan) {
    console.log(" ", k.qty, "project", k.surat_jalan.project_id);
  }
  if (kelebihan.length === 0) {
    console.log("  (none)");
  }

  await prisma.$disconnect();
})();
