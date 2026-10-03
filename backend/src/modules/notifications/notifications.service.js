const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");

const buildUserScope = (user) => {
  const or = [];
  if (user?.id !== undefined && user.id !== null) {
    or.push({ user_id: BigInt(user.id) });
  }
  if (user?.role) {
    or.push({ role: user.role });
  }
  return or.length > 0 ? { OR: or } : {};
};

const list = async (user, query = {}) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const since = typeof query.since === "string" && query.since.trim() ? query.since.trim() : null;

  const isReadFilter =
    query.is_read === "true" ? true : query.is_read === "false" ? false : null;

  const where = {
    ...buildUserScope(user),
    ...(isReadFilter !== null ? { is_read: isReadFilter } : {}),
    ...(since ? { created_at: { gt: new Date(since) } } : {}),
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
    since: since || new Date().toISOString(),
  };
};

const unreadCount = async (user) => {
  const where = {
    ...buildUserScope(user),
    is_read: false,
  };

  return prisma.notification.count({ where });
};

const markRead = async (user, id) => {
  const where = {
    id,
    ...buildUserScope(user),
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
    ...buildUserScope(user),
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

const deleteOne = async (user, id) => {
  const where = {
    id,
    ...buildUserScope(user),
  };

  const record = await prisma.notification.findFirst({ where });

  if (!record) {
    throw new AppError("Notifikasi tidak ditemukan.", 404);
  }

  await prisma.notification.delete({
    where: { id },
  });

  return { deleted: true };
};

const deleteMany = async (user) => {
  const where = {
    ...buildUserScope(user),
  };

  const result = await prisma.notification.deleteMany({
    where,
  });

  return {
    count: result.count,
  };
};

const create = async ({ userId, role, type, title, message, link }) => {
  const createOne = async (targetUserId, targetRole) => {
    return prisma.notification.create({
      data: {
        user_id: targetUserId !== undefined && targetUserId !== null ? BigInt(targetUserId) : null,
        role: targetRole || null,
        type: type || "info",
        title,
        message,
        link: link || null,
      },
    });
  };

  if (Array.isArray(userId)) {
    if (userId.length === 0) return [];
    return prisma.notification.createMany({
      data: userId.map((id) => ({
        user_id: id !== undefined && id !== null ? BigInt(id) : null,
        role: role || null,
        type: type || "info",
        title,
        message,
        link: link || null,
      })),
    });
  }

  return createOne(userId, role);
};

module.exports = {
  list,
  unreadCount,
  markRead,
  markAllRead,
  deleteOne,
  deleteMany,
  create,
};
