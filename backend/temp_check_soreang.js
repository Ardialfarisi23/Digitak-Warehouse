require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const projectId = 11;
  const project = await prisma.project.findUnique({
    where: { project_id: BigInt(projectId) },
    select: { project_id: true, nama_project: true, status_aktif: true },
  });
  console.log("Project:", JSON.stringify({
    project_id: Number(project.project_id),
    nama_project: project.nama_project,
    status_aktif: project.status_aktif,
  }, null, 2));

  const suratJalans = await prisma.surat_jalan.findMany({
    where: { project_id: BigInt(projectId) },
    select: {
      surat_jalan_id: true,
      nomor_surat_jalan: true,
      tipe: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { created_at: "desc" },
  });

  console.log(`\nTotal surat_jalan untuk project: ${suratJalans.length}`);
  const mapped = suratJalans.map(sj => ({
    surat_jalan_id: Number(sj.surat_jalan_id),
    nomor_surat_jalan: sj.nomor_surat_jalan,
    tipe: sj.tipe,
    status: sj.status,
    created_at: sj.created_at,
    updated_at: sj.updated_at,
  }));
  console.log(JSON.stringify(mapped, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
