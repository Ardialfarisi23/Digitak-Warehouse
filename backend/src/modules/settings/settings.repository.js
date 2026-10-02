const prisma = require("../../config/prisma");

const getAllPreferences = async (userId) => {
  const prefs = await prisma.user_notification_preferences.findMany({
    where: { user_id: BigInt(userId) },
  });

  return prefs.map((pref) => ({
    category: pref.category,
    enabled: pref.enabled,
  }));
};

const getPreference = async (userId, category) => {
  const pref = await prisma.user_notification_preferences.findFirst({
    where: {
      user_id: BigInt(userId),
      category,
    },
  });

  if (!pref) return null;

  return {
    category: pref.category,
    enabled: pref.enabled,
  };
};

const upsertPreference = async (userId, category, enabled) => {
  const pref = await prisma.user_notification_preferences.upsert({
    where: {
      user_id_category: {
        user_id: BigInt(userId),
        category,
      },
    },
    update: {
      enabled,
      updated_at: new Date(),
    },
    create: {
      user_id: BigInt(userId),
      category,
      enabled,
    },
  });

  return {
    category: pref.category,
    enabled: pref.enabled,
  };
};

const upsertManyPreferences = async (userId, preferences) => {
  const results = [];

  for (const pref of preferences) {
    const result = await upsertPreference(userId, pref.category, pref.enabled);
    results.push(result);
  }

  return results;
};

const initializeDefaultPreferences = async (userId) => {
  const existing = await prisma.user_notification_preferences.findMany({
    where: { user_id: BigInt(userId) },
  });

  if (existing.length > 0) {
    return existing.map((pref) => ({
      category: pref.category,
      enabled: pref.enabled,
    }));
  }

  const categories = ["BOQ", "SURAT_JALAN", "USER", "ITEM", "PROJECT", "GUDANG", "ZONA"];

  const defaults = await prisma.user_notification_preferences.createMany({
    data: categories.map((category) => ({
      user_id: BigInt(userId),
      category,
      enabled: true,
    })),
  });

  const created = await prisma.user_notification_preferences.findMany({
    where: { user_id: BigInt(userId) },
  });

  return created.map((pref) => ({
    category: pref.category,
    enabled: pref.enabled,
  }));
};

module.exports = {
  getAllPreferences,
  getPreference,
  upsertPreference,
  upsertManyPreferences,
  initializeDefaultPreferences,
};
