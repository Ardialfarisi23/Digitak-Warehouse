require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const projectId = 8;
  const boqs = await prisma.boq.findMany({
    where: {
      tiket: { project_id: BigInt(projectId) },
    },
    select: {
      boq_id: true,
      status: true,
      boq_number: true,
      tiket: {
        select: { kode_tiket: true, project_id: true },
      },
    },
  });
  console.log("BOQs for project:");
  console.log(JSON.stringify(boqs.map(b => ({
    boq_id: Number(b.boq_id),
    status: b.status,
    boq_number: b.boq_number,
    kode_tiket: b.tiket?.kode_tiket || null,
    project_id: b.tiket?.project_id ? Number(b.tiket.project_id) : null,
  })), null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
