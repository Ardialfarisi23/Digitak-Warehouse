const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function safeStringify(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

async function check() {
  const totalPersonil = await prisma.personil.count();
  const withGudang = await prisma.personil.count({
    where: { gudang_id: { not: null } }
  });
  const withoutGudang = await prisma.personil.count({
    where: { gudang_id: null }
  });
  
  console.log('Total personil:', totalPersonil);
  console.log('Dengan gudang_id:', withGudang);
  console.log('Tanpa gudang_id (null):', withoutGudang);
  
  // Show samples with gudang
  const withGudangSamples = await prisma.personil.findMany({
    where: { gudang_id: { not: null } },
    select: { personil_id: true, nama: true, gudang_id: true, user_id: true },
    take: 10
  });
  console.log('\nSample personil WITH gudang_id:', safeStringify(withGudangSamples));
  
  // Show samples without gudang
  const withoutGudangSamples = await prisma.personil.findMany({
    where: { gudang_id: null },
    select: { personil_id: true, nama: true, gudang_id: true, user_id: true },
    take: 10
  });
  console.log('\nSample personil WITHOUT gudang_id:', safeStringify(withoutGudangSamples));
  
  // Check user_accounts that have role 'staff'
  const staffUsers = await prisma.user_account.findMany({
    where: { role: 'staf_gudang' },
    select: { user_id: true, nama: true, email: true, role: true }
  });
  console.log('\nStaff users:', safeStringify(staffUsers));
  
  // Check if staff users have personil records with gudang_id
  if (staffUsers.length > 0) {
    const staffUserIds = staffUsers.map(u => Number(u.user_id));
    const personilWithUserId = await prisma.personil.findMany({
      where: { user_id: { in: staffUserIds } },
      select: { personil_id: true, nama: true, user_id: true, gudang_id: true, is_dummy: true }
    });
    console.log('\nPersonil records linked to staff users:', safeStringify(personilWithUserId));
  }
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect());
