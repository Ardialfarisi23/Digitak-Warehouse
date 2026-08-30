const prisma = require("../src/config/prisma");

async function main() {
  const withBoq = await prisma.surat_jalan.count({
    where: { boq_id: { not: null } },
  });
  const withoutBoq = await prisma.surat_jalan.count({
    where: { boq_id: null },
  });
  const total = await prisma.surat_jalan.count();
  console.log(`Total surat_jalan: ${Number(total)}`);
  console.log(`With boq_id: ${Number(withBoq)}`);
  console.log(`Without boq_id (null): ${Number(withoutBoq)}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
