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

const createPasswordResetToken = async (data) => {
  await prisma.password_reset_token.deleteMany({
    where: { email: data.email },
  });

  return prisma.password_reset_token.create({
    data,
  });
};

const findPasswordResetToken = async (token, email) => {
  return prisma.password_reset_token.findFirst({
    where: {
      token,
      email,
      expires: { gt: new Date() },
    },
  });
};

const deletePasswordResetToken = async (token) => {
  return prisma.password_reset_token.deleteMany({
    where: { token },
  });
};

module.exports = {
  findByEmail,
  updatePassword,
  createPasswordResetToken,
  findPasswordResetToken,
  deletePasswordResetToken,
};
