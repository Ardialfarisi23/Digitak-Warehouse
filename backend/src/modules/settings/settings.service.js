const settingsRepository = require("./settings.repository");
const AppError = require("../../shared/errors");

const getNotificationPreferences = async (userId) => {
  let prefs = await settingsRepository.getAllPreferences(userId);

  if (prefs.length === 0) {
    prefs = await settingsRepository.initializeDefaultPreferences(userId);
  }

  return prefs;
};

const updateNotificationPreferences = async (userId, preferences) => {
  if (!Array.isArray(preferences) || preferences.length === 0) {
    throw new AppError("Data preferensi tidak valid.", 400);
  }

  const validCategories = ["BOQ", "SURAT_JALAN", "USER", "ITEM", "PROJECT", "GUDANG", "ZONA"];

  for (const pref of preferences) {
    if (!validCategories.includes(pref.category)) {
      throw new AppError(`Kategori notifikasi tidak valid: ${pref.category}`, 400);
    }

    if (typeof pref.enabled !== "boolean") {
      throw new AppError("Field enabled harus berupa boolean.", 400);
    }
  }

  const results = await settingsRepository.upsertManyPreferences(userId, preferences);

  return {
    message: "Preferensi notifikasi berhasil diperbarui.",
    data: results,
  };
};

const getUserSettings = async (userId) => {
  const notificationPrefs = await getNotificationPreferences(userId);

  return {
    notifications: notificationPrefs,
  };
};

const updateUserSettings = async (userId, data) => {
  const results = {};

  if (data.notifications && Array.isArray(data.notifications)) {
    results.notifications = await updateNotificationPreferences(userId, data.notifications);
  }

  return {
    message: "Pengaturan berhasil diperbarui.",
    data: results,
  };
};

module.exports = {
  getNotificationPreferences,
  updateNotificationPreferences,
  getUserSettings,
  updateUserSettings,
};
