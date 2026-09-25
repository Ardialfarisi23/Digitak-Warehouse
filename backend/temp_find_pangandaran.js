require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const keyword = "FTTH Open Area Pangandaran RW 01";
  const projects = await prisma.project.findMany({
    select: { project_id: true, nama_project: true, status_aktif: true },
    where: { nama_project: { contains: keyword, mode: "insensitive" } },
  });

  const mapped = projects.map((r) => ({
    project_id: Number(r.project_id),
    nama_project: r.nama_project,
    status_aktif: r.status_aktif,
  }));
  console.log("Projects:");
  console.log(JSON.stringify(mapped, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
