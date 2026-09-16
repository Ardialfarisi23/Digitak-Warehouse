const settingsService = require("./settings.service");
const response = require("../../shared/response");

const getNotificationPreferences = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return response.error(res, "Tidak dapat mengidentifikasi pengguna.", 401);
    }

    const prefs = await settingsService.getNotificationPreferences(userId);

    return response.success(res, "Preferensi notifikasi berhasil diambil.", prefs);
  } catch (err) {
    next(err);
  }
};

const updateNotificationPreferences = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return response.error(res, "Tidak dapat mengidentifikasi pengguna.", 401);
    }

    const result = await settingsService.updateNotificationPreferences(userId, req.body.notifications);

    return response.success(res, result.message, result.data);
  } catch (err) {
    next(err);
  }
};

const getUserSettings = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return response.error(res, "Tidak dapat mengidentifikasi pengguna.", 401);
    }

    const settings = await settingsService.getUserSettings(userId);

    return response.success(res, "Pengaturan berhasil diambil.", settings);
  } catch (err) {
    next(err);
  }
};

const updateUserSettings = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return response.error(res, "Tidak dapat mengidentifikasi pengguna.", 401);
    }

    const result = await settingsService.updateUserSettings(userId, req.body);

    return response.success(res, result.message, result.data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotificationPreferences,
  updateNotificationPreferences,
  getUserSettings,
  updateUserSettings,
};
