const { PrismaClient } = require('C:/Users/user/Digitak-Warehouse/backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const supervisorId = BigInt(2);
  const supervisorRole = "supervisor";
  
  const where = {
    OR: [
      { user_id: supervisorId },
      { role: supervisorRole }
    ]
  };
  
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { created_at: "desc" }
  });
  
  console.log(`Notifications for supervisor (id=2, role=supervisor): ${notifications.length}`);
  for (const n of notifications) {
    console.log(`ID: ${n.id} | role: ${n.role} | userId: ${n.user_id} | title: ${n.title} | message: ${n.message}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
