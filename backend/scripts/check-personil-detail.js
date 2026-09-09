const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function safeStringify(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

async function check() {
  // Check user_id 5 and 6 who have personil with gudang_id but are not in staff list
  const users5and6 = await prisma.user_account.findMany({
    where: { user_id: { in: [5, 6] } },
    select: { user_id: true, nama: true, email: true, role: true }
  });
  console.log('Users with personil+gudang but not staff:', safeStringify(users5and6));
  
  // Check ALL personil with their user role
  const allPersonilWithUser = await prisma.personil.findMany({
    include: {
      user: {
        select: { user_id: true, nama: true, email: true, role: true }
      }
    }
  });
  console.log('\nAll personil with user info:');
  for (const p of allPersonilWithUser) {
    console.log(`  personil_id=${p.personil_id}, nama=${p.nama}, gudang_id=${p.gudang_id}, user=${p.user ? safeStringify(p.user) : 'null'}`);
  }
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect());
