const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function safeStringify(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

async function main() {
  console.log('Searching personil records...');
  const personilResults = await prisma.$queryRaw`
    SELECT personil_id, nama FROM personil
    WHERE nama ILIKE '%biladi%' OR nama ILIKE '%urahmah%'
  `;
  console.log('personil results:', safeStringify(personilResults));

  console.log('\nSearching user_account records...');
  const userResults = await prisma.$queryRaw`
    SELECT user_id, nama FROM user_account
    WHERE nama ILIKE '%biladi%' OR nama ILIKE '%urahmah%'
  `;
  console.log('user_account results:', safeStringify(userResults));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
