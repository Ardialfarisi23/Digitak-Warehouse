const prisma = require('D:/Project/digitak-warehouse/backend/src/config/prisma');

async function countInFlightSJ() {
  const boqSelesai = await prisma.boq.findMany({
    where: { status: 'selesai' },
    select: { boq_id: true },
  });
  const ids = boqSelesai.map(b => Number(b.boq_id));

  const count = await prisma.surat_jalan.count({
    where: {
      boq_id: { in: ids },
      status: { notIn: ['ditolak', 'diterima_didistribusikan'] },
    },
  });

  console.log(`BOQ selesai count: ${ids.length}`);
  console.log(`In-flight SJ referencing BOQ selesai: ${count}`);

  const rows = await prisma.surat_jalan.findMany({
    where: {
      boq_id: { in: ids },
      status: { notIn: ['ditolak', 'diterima_didistribusikan'] },
    },
    select: { surat_jalan_id: true, nomor_surat_jalan: true, boq_id: true, status: true },
  });

  const safe = rows.map(r => ({
    ...r,
    surat_jalan_id: Number(r.surat_jalan_id),
    boq_id: Number(r.boq_id),
  }));
  console.log(JSON.stringify(safe, null, 2));

  await prisma.$disconnect();
}

countInFlightSJ().catch(err => {
  console.error(err);
  process.exit(1);
});
