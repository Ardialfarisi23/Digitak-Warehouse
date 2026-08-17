const prisma = require("../../config/prisma");

const findById = async (id) => {
  return await prisma.personnel.findUnique({
    where: { id },
  });
};

const updateProfile = async (id, data) => {
  return await prisma.personnel.update({
    where: { id },
    data,
  });
};

module.exports = {
  findById,
  updateProfile,
};
