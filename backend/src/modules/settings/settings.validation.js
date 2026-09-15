const { z } = require("zod");

const notificationPreferenceSchema = z.object({
  category: z.enum(["BOQ", "SURAT_JALAN", "USER", "ITEM", "PROJECT", "GUDANG", "ZONA"]),
  enabled: z.boolean(),
});

const updateNotificationPreferencesSchema = z.object({
  notifications: z.array(notificationPreferenceSchema).min(1, "Minimal satu preferensi harus diupdate."),
});

const updateUserSettingsSchema = z.object({
  notifications: z.array(notificationPreferenceSchema).optional(),
});

module.exports = {
  updateNotificationPreferencesSchema,
  updateUserSettingsSchema,
};
