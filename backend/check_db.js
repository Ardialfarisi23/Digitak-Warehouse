const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const clusters = await prisma.cluster.findMany({
    where: { cluster_id: { startsWith: 'NET-H' } },
    select: { cluster_id: true, project_id: true, nama_cluster: true, homepass_plan: true, no_tiket_release: true }
  });
  console.log('NET-H clusters:', clusters);
  
  const projects = await prisma.project.findMany({
    where: { nama_project: { contains: 'Rancamanyar' } },
    select: { project_id: true, nama_project: true, cluster_id: true, area: true }
  });
  console.log('Rancamanyar projects:', projects);
  
  const items = await prisma.barang.findMany({
    where: { kode_perangkat: { startsWith: '[01' } },
    select: { barang_id: true, kode_perangkat: true, nama_barang: true, satuan_default_id: true }
  });
  console.log('[01- items count:', items.length);
  items.slice(0,5).forEach(i => console.log(' ', i));
  
  const satuan = await prisma.satuan.findMany({
    select: { satuan_id: true, kode_satuan: true }
  });
  console.log('Satuan:', satuan);
}

check().finally(() => prisma.$disconnect());