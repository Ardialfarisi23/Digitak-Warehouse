require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.tiket_material.count();
  const withBoq = await prisma.tiket_material.count({
    where: { boq: { isNot: null } },
  });
  console.log("Total tiket_material:", total);
  console.log("With BOQ:", withBoq);

  const allTikets = await prisma.tiket_material.findMany({
    include: {
      project: { select: { nama_project: true } },
      boq: { select: { boq_id: true } },
    },
    orderBy: { tiket_id: "asc" },
  });

  for (const t of allTikets) {
    console.log(
      `tiket_id=${t.tiket_id} kode=${t.kode_tiket} project=${t.project?.nama_project || "-"} boq=${t.boq?.boq_id || "null"} used=${t.used}`
    );
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
