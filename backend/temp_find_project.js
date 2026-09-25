require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.project.findMany({
    select: { project_id: true, nama_project: true },
    where: {
      OR: [
        { nama_project: { contains: "Soreang", mode: "insensitive" } },
        { nama_project: { contains: "Backbone", mode: "insensitive" } },
      ],
    },
  });
  const projects = rows.map((r) => ({
    project_id: Number(r.project_id),
    nama_project: r.nama_project,
  }));
  console.log(JSON.stringify(projects, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
