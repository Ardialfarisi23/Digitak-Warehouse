const prisma = require("../../config/prisma");

const findById = async (id) => {
  return await prisma.user_account.findUnique({
    where: { user_id: id },
    include: {
      personils: {
        include: {
          gudang: true,
        },
      },
    },
  });
};

const updateProfile = async (id, data) => {
  return await prisma.personil.update({
    where: { personil_id: id },
    data,
  });
};

module.exports = {
  findById,
  updateProfile,
};
