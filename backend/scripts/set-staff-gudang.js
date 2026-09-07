const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setGudangForStaff() {
  // Set gudang_id = 1 for Taufik Hidayat (user_id = 13, personil_id = 10)
  const result = await prisma.personil.update({
    where: { personil_id: 10 },
    data: { gudang_id: 1 },
    select: { personil_id: true, nama: true, gudang_id: true }
  });
  console.log('Updated personil:', JSON.stringify(result, (k, v) => typeof v === 'bigint' ? v.toString() : v));
  
  // Verify
  const verify = await prisma.personil.findMany({
    where: { gudang_id: { not: null } },
    select: { personil_id: true, nama: true, gudang_id: true, user_id: true }
  });
  console.log('Personil with gudang_id after update:', JSON.stringify(verify, (k, v) => typeof v === 'bigint' ? v.toString() : v));
}

setGudangForStaff()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
