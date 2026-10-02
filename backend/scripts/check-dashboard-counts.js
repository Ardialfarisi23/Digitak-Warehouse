const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const sjPending = await prisma.surat_jalan.count({
    where: { status: { in: ['draft_diajukan', 'disetujui', 'digenerate'] } }
  });
  const approvalMenunggu = await prisma.approval_log.count({
    where: { status: 'menunggu' }
  });
  const totalSj = await prisma.surat_jalan.count();
  const totalApproval = await prisma.approval_log.count();
  
  console.log('Total surat_jalan:', totalSj);
  console.log('Pending (draft_diajukan/disetujui/digenerate):', sjPending);
  console.log('Total approval_log:', totalApproval);
  console.log('Menunggu:', approvalMenunggu);
}

check().catch(e => console.error(e)).finally(() => prisma.disconnect());
