const prisma = require("./src/config/prisma");

(async () => {
  const users = await prisma.user_account.findMany({
    where: { email: { in: ["admin@gmail.com", "supervisor@gmail.com"] } },
    select: { user_id: true, email: true, password_hash: true },
  });
  for (const u of users) {
    console.log(u.user_id, u.email, u.password_hash);
  }
  await prisma.$disconnect();
})();
