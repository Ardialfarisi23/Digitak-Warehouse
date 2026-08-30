const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT sj.surat_jalan_id, sj.nomor_surat_jalan, sj.boq_id, b.tiket_id, tm.kode_tiket
    FROM surat_jalan sj
    LEFT JOIN boq b ON sj.boq_id = b.boq_id
    LEFT JOIN tiket_material tm ON b.tiket_id = tm.tiket_id
    WHERE sj.boq_id IS NULL OR tm.kode_tiket IS NULL OR tm.kode_tiket = ''
    LIMIT 20
  `;
  console.log("Surat jalan tanpa BOQ atau dengan kode_tiket kosong:");
  for (const r of result) {
    console.log(`  sj_id=${r.surat_jalan_id}, nomor=${r.nomor_surat_jalan}, boq_id=${r.boq_id}, tiket_id=${r.tiket_id}, kode_tiket=${r.kode_tiket}`);
  }

  const count = await prisma.stok_ledger.count();
  console.log("\nTotal stok_ledger:", count);

  const sample = await prisma.stok_ledger.findMany({
    take: 10,
    include: {
      surat_jalan_item: {
        include: {
          surat_jalan: {
            include: {
              boq: {
                include: {
                  tiket: {
                    select: { tiket_id: true, kode_tiket: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  console.log("\nSample stok_ledger with kode_tiket:");
  for (const r of sample) {
    const sj = r.surat_jalan_item?.surat_jalan;
    const kt = sj?.boq?.tiket?.kode_tiket;
    console.log(`  ledger_id=${r.ledger_id}, sj_id=${sj?.surat_jalan_id}, boq_id=${sj?.boq_id}, kode_tiket=${kt}`);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
