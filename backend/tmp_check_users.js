const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function serialize(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? Number(value) : value), 2)
  );
}

(async () => {
  try {
    const users = await prisma.$queryRaw`
      SELECT user_id, email, role, is_aktif, password_hash 
      FROM user_account 
      LIMIT 10;
    `;
    console.log(JSON.stringify(serialize(users), null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
