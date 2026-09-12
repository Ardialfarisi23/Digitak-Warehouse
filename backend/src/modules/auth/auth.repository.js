const prisma = require("../../config/prisma");

const findByEmail = async (email, options = {}) => {
  const where = {};
  if (email) {
    where.email = email;
  } else if (options.userId) {
    where.user_id = BigInt(options.userId);
  } else {
    return null;
  }

  return prisma.user_account.findFirst({
    where,
    include: {
      personils: true,
    },
  });
};

const updatePassword = async (userId, passwordHash) => {
  return prisma.user_account.update({
    where: { user_id: BigInt(userId) },
    data: {
      password_hash: passwordHash,
      must_change_password: false,
    },
  });
};

module.exports = {
  findByEmail,
  updatePassword,
};
