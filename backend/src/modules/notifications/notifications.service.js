const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");

const list = async (user, query = {}) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);

  const isReadFilter =
    query.is_read === "true" ? true : query.is_read === "false" ? false : null;

  const where = {
    OR: [{ user_id: Number(user.id) }, { role: user.role }],
    ...(isReadFilter !== null ? { is_read: isReadFilter } : {}),
  };

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

const unreadCount = async (user) => {
  const where = {
    OR: [{ user_id: Number(user.id) }, { role: user.role }],
    is_read: false,
  };

  return prisma.notification.count({ where });
};

const markRead = async (user, id) => {
  const where = {
    id,
    OR: [{ user_id: Number(user.id) }, { role: user.role }],
    is_read: false,
  };

  const record = await prisma.notification.findFirst({ where });

  if (!record) {
    throw new AppError("Notifikasi tidak ditemukan.", 404);
  }

  return prisma.notification.update({
    where: { id },
    data: {
      is_read: true,
      read_at: new Date(),
    },
  });
};

const markAllRead = async (user, isRead = true) => {
  const where = {
    OR: [{ user_id: Number(user.id) }, { role: user.role }],
    is_read: !isRead,
  };

  const result = await prisma.notification.updateMany({
    where,
    data: {
      is_read: true,
      read_at: new Date(),
    },
  });

  return {
    count: result.count,
  };
};

const create = async ({ userId, role, type, title, message, link }) => {
  return prisma.notification.create({
    data: {
      user_id: userId ? Number(userId) : null,
      role: role || null,
      type: type || "info",
      title,
      message,
      link: link || null,
    },
  });
};

module.exports = {
  list,
  unreadCount,
  markRead,
  markAllRead,
  create,
};
