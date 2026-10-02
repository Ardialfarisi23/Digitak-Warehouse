const { PrismaClient } = require("@prisma/client");
const path = require("path");
const prisma = new PrismaClient();

async function main() {
  const repo = require(path.join(__dirname, "..", "src", "modules", "reports", "reports.repository"));

  // Manually test buildPickZonaMap
  const data = await prisma.stok_ledger.findMany({
    where: {
      surat_jalan_item: {
        surat_jalan: {
          tipe: "outbound",
        },
      },
    },
    include: {
      surat_jalan_item: {
        include: {
          surat_jalan: {
            select: {
              surat_jalan_id: true,
              tipe: true,
              status: true,
            },
          },
          picks: {
            select: {
              zona_id: true,
              qty: true,
              picked_at: true,
            },
            orderBy: {
              picked_at: "asc",
            },
          },
        },
      },
    },
    take: 20,
  });

  console.log("Data sample:", JSON.stringify({
    count: data.length,
    first: data[0] ? {
      ledger_id: String(data[0].ledger_id),
      picks: data[0].surat_jalan_item?.picks?.map(p => ({ zona_id: p.zona_id ? String(p.zona_id) : null })),
    } : null,
  }, null, 2));

  // Call buildPickZonaMap
  const pickZonaMap = await repo.buildPickZonaMap(data, prisma);
  console.log("pickZonaMap size:", pickZonaMap.size);
  for (const [key, value] of pickZonaMap.entries()) {
    console.log("Key:", key, "Value:", typeof value === "string" ? value : value?.kode_zona || "null");
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
