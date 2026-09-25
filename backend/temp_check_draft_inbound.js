require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.surat_jalan.groupBy({
    by: ["status", "tipe"],
    where: {
      status: {
        in: ["draft_diajukan", "menunggu_verifikasi"],
      },
    },
    _count: {
      _all: true,
    },
  });

  console.log(JSON.stringify(counts.map(c => ({
    status: c.status,
    tipe: c.tipe,
    count: c._count._all,
  })), null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
