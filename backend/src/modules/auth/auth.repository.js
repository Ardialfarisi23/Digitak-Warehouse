const prisma = require("../../config/prisma");

const findByEmail = async (email) => {
  return prisma.user_account.findUnique({
    where: { email },
    include: {
      personils: true,
    },
  });
};

module.exports = {
  findByEmail,
};
