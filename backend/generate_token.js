const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const JWT_SECRET = 'digitakwarehouse_super_secret';

async function main() {
  const admin = await prisma.user_account.findFirst({
    where: { role: 'admin_general' },
    select: { user_id: true, email: true, role: true },
  });
  console.log('Admin user:', admin);

  if (!admin) {
    console.error('No admin found');
    return;
  }

  const token = jwt.sign(
    {
      id: String(admin.user_id),
      email: admin.email,
      role: admin.role,
      avatar_url: null,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log('TOKEN:', token);
  await prisma.$disconnect();
}

main();
