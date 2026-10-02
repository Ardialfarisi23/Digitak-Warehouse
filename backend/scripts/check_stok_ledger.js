const prisma = require("../src/config/prisma");

async function main() {
  const ledgerCount = await prisma.stok_ledger.count();
  console.log("Total stok_ledger entries:", Number(ledgerCount));

  const sample = await prisma.stok_ledger.findMany({
    take: 5,
    include: {
      surat_jalan_item: {
        include: {
          surat_jalan: {
            include: {
              boq: {
                include: {
                  tiket: {
                    select: { tiket_id: true, kode_tiket: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  console.log("\n=== SAMPLE STOK LEDGER (5 entries) ===");
  for (const entry of sample) {
    const sj = entry.surat_jalan_item?.surat_jalan;
    const boq = sj?.boq;
    const tiket = boq?.tiket;
    console.log(JSON.stringify({
      ledger_id: Number(entry.ledger_id),
      surat_jalan_id: sj ? Number(sj.surat_jalan_id) : null,
      boq_id: boq ? Number(boq.boq_id) : null,
      tiket_id: tiket ? Number(tiket.tiket_id) : null,
      kode_tiket: tiket?.kode_tiket || null,
    }, null, 2));
  }

  // Count how many ledger entries have tiket vs don't have tiket
  const allLedger = await prisma.stok_ledger.findMany({
    include: {
      surat_jalan_item: {
        include: {
          surat_jalan: {
            include: {
              boq: {
                include: {
                  tiket: {
                    select: { tiket_id: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  let withTiket = 0;
  let withoutTiket = 0;
  let withoutBoq = 0;

  for (const entry of allLedger) {
    const sj = entry.surat_jalan_item?.surat_jalan;
    if (!sj?.boq_id) {
      withoutBoq++;
      withoutTiket++;
    } else if (sj?.boq?.tiket) {
      withTiket++;
    } else {
      withoutTiket++;
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log("With tiket:", withTiket);
  console.log("Without tiket:", withoutTiket);
  console.log("Without boq:", withoutBoq);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
