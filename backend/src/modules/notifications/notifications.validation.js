const { z } = require("zod");

const listNotificationsSchema = z.object({
  is_read: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const markReadSchema = z.object({
  id: z.coerce.number().int().min(1),
});

const markAllReadSchema = z.object({
  is_read: z.boolean().optional(),
});

module.exports = {
  listNotificationsSchema,
  markReadSchema,
  markAllReadSchema,
};
