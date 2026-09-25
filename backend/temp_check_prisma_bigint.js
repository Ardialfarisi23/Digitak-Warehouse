const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const row = await prisma.surat_jalan.findUnique({
    where: { surat_jalan_id: 44 },
    select: { created_by: true },
  });

  console.log("created_by raw value:", row?.created_by);
  console.log("created_by typeof:", typeof row?.created_by);
  console.log("created_by === 8:", row?.created_by === 8);
  console.log("created_by === '8':", row?.created_by === "8");
  console.log("JSON stringify:", JSON.stringify(row?.created_by));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
