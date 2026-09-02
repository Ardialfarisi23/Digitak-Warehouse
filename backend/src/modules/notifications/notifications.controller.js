const notificationService = require("./notifications.service");
const response = require("../../shared/response");

const list = async (req, res, next) => {
  try {
    const result = await notificationService.list(req.user, req.query);
    return response.success(res, "Daftar notifikasi berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const unreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.unreadCount(req.user);
    return response.success(res, "Jumlah notifikasi belum dibaca berhasil diambil.", { count });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const record = await notificationService.markRead(req.user, Number(req.params.id));
    return response.success(res, "Notifikasi berhasil ditandai sebagai dibaca.", record);
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllRead(req.user, req.body?.is_read);
    return response.success(res, "Notifikasi berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  unreadCount,
  markRead,
  markAllRead,
};
