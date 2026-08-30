const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const suratJalans = await prisma.surat_jalan.findMany({
    select: {
      surat_jalan_id: true,
      nomor_surat_jalan: true,
      boq_id: true,
      tipe: true,
      status: true,
      project_id: true,
      boq: {
        select: {
          boq_id: true,
          tiket: {
            select: {
              kode_tiket: true,
            },
          },
        },
      },
    },
  });

  console.log('surat_jalan records:');
  for (const sj of suratJalans) {
    console.log(`  SJ ${sj.nomor_surat_jalan}: boq_id=${sj.boq_id}, boq exists=${!!sj.boq}, tiket kode_tiket=${sj.boq?.tiket?.kode_tiket || 'N/A'}`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
