const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const row = await prisma.surat_jalan.findUnique({
    where: { surat_jalan_id: 44 },
    select: { created_by: true, surat_jalan_id: true },
  });

  console.log("typeof created_by:", typeof row.created_by);
  console.log("typeof surat_jalan_id:", typeof row.surat_jalan_id);
  console.log("created_by === 8:", row.created_by === 8);
  console.log("created_by === '8':", row.created_by === "8");
  console.log("surat_jalan_id === 44:", row.surat_jalan_id === 44);
  console.log("surat_jalan_id === '44':", row.surat_jalan_id === "44");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
