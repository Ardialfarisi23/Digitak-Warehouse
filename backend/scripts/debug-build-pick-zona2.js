const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
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
    withPicks: data.filter(d => d.surat_jalan_item?.picks?.length > 0).length,
    withoutPicks: data.filter(d => !d.surat_jalan_item?.picks?.length).length,
    firstWithPick: data.find(d => d.surat_jalan_item?.picks?.length > 0) ? {
      ledger_id: String(data.find(d => d.surat_jalan_item?.picks?.length > 0).ledger_id),
      picks: data.find(d => d.surat_jalan_item?.picks?.length > 0).surat_jalan_item?.picks?.map(p => ({ zona_id: p.zona_id ? String(p.zona_id) : null })),
    } : null,
  }, null, 2));

  // Manually build pickZonaMap
  const allZonaIds = new Set();
  for (const r of data) {
    const picks = r.surat_jalan_item?.picks;
    if (Array.isArray(picks)) {
      for (const p of picks) {
        if (p?.zona_id != null) {
          allZonaIds.add(Number(p.zona_id));
        }
      }
    }
  }

  console.log("Unique zona IDs:", Array.from(allZonaIds));

  if (allZonaIds.size > 0) {
    const zonaRecords = await prisma.zona_gudang.findMany({
      where: { zona_id: { in: Array.from(allZonaIds) } },
      select: {
        zona_id: true,
        kode_zona: true,
        nama_zona: true,
        tipe_zona: true,
        gudang: {
          select: {
            nama_gudang: true,
          },
        },
      },
    });

    console.log("Zona records:", JSON.stringify(zonaRecords.map(z => ({
      zona_id: String(z.zona_id),
      kode_zona: z.kode_zona,
      nama_zona: z.nama_zona,
      gudang: z.gudang?.nama_gudang,
    })), null, 2));

    const zonaMap = new Map();
    for (const z of zonaRecords) {
      zonaMap.set(Number(z.zona_id), z);
    }

    const result = new Map();
    for (const r of data) {
      const picks = r.surat_jalan_item?.picks;
      if (!Array.isArray(picks) || !picks.length) {
        result.set(r.ledger_id, null);
        continue;
      }

      const uniqueZonaIds = [...new Set(picks.map((p) => Number(p.zona_id)).filter((id) => !Number.isNaN(id)))];
      if (uniqueZonaIds.length === 0) {
        result.set(r.ledger_id, null);
        continue;
      }

      if (uniqueZonaIds.length === 1) {
        result.set(r.ledger_id, zonaMap.get(uniqueZonaIds[0]) || null);
        continue;
      }

      const labels = uniqueZonaIds
        .map((id) => {
          const z = zonaMap.get(id);
          if (!z) return null;
          const nama = z.nama_zona || z.kode_zona || `Zona ${id}`;
          const gudang = z.gudang?.nama_gudang || "";
          return gudang ? `${nama} / ${gudang}` : nama;
        })
        .filter(Boolean);

      result.set(r.ledger_id, labels.join(", "));
    }

    console.log("Result map size:", result.size);
    for (const [key, value] of result.entries()) {
      console.log("ledger_id:", String(key), "zona:", typeof value === "string" ? value : value?.kode_zona || "null");
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
