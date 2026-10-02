const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");

const list = async (filters = {}) => {
  const where = {};

  if (filters.role) {
    where.role = filters.role;
  }

  if (typeof filters.isRead === "boolean") {
    where.is_read = filters.isRead;
  }

  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 20);

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

const findById = async (id) => {
  return prisma.notification.findUnique({
    where: { id: Number(id) },
  });
};

const updateRead = async (id, isRead = true) => {
  return prisma.notification.update({
    where: { id: Number(id) },
    data: {
      is_read: isRead,
      read_at: isRead ? new Date() : null,
    },
  });
};

const updateManyRead = async (filters = {}, isRead = true) => {
  const where = {};

  if (filters.userId) {
    where.user_id = Number(filters.userId);
  }

  if (filters.role) {
    where.role = filters.role;
  }

  if (typeof filters.isRead === "boolean") {
    where.is_read = filters.isRead;
  }

  return prisma.notification.updateMany({
    where,
    data: {
      is_read: true,
      read_at: new Date(),
    },
  });
};

module.exports = {
  list,
  findById,
  updateRead,
  updateManyRead,
};
