const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const logs = await prisma.approval_log.findMany({
    where: {
      entity_type: 'surat_jalan',
      entity_id: { in: [36, 23, 9, 4, 3].map(Number) },
      tahap: 'outbound_approval',
      status: 'disetujui',
    },
    orderBy: { created_at: 'desc' },
    include: { approver: { select: { nama: true } } }
  });
  const safe = JSON.parse(JSON.stringify(logs, (_, v) => typeof v === 'bigint' ? Number(v) : v, 2));
  console.log(JSON.stringify(safe, null, 2));
  await prisma.$disconnect();
})();
