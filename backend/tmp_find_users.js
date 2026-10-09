const prisma = require("./src/config/prisma");

(async () => {
  const users = await prisma.user_account.findMany({
    where: { role: { in: ["admin_general", "supervisor"] } },
    select: { user_id: true, nama: true, email: true, role: true },
    take: 5,
  });
  for (const u of users) {
    console.log(u.user_id, u.nama, u.email, u.role);
  }
  await prisma.$disconnect();
})();
