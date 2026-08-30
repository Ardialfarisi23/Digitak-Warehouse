const prisma = require("../src/config/prisma");

async function main() {
  const sj = await prisma.surat_jalan.findUnique({
    where: { surat_jalan_id: 19 },
    include: {
      boq: {
        include: {
          tiket: {
            select: { tiket_id: true, kode_tiket: true },
          },
        },
      },
      items: {
        include: {
          barang: {
            select: { barang_id: true, kode_perangkat: true, nama_barang: true },
          },
        },
      },
    },
  });

  const data = JSON.parse(JSON.stringify(sj, (key, value) =>
    typeof value === "bigint" ? Number(value) : value
  ));

  console.log(JSON.stringify(data, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
