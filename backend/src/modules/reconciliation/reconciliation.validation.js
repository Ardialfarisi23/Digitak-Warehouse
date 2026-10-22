const { z } = require("zod");

const getReconciliationInventorySchema = z.object({
  search: z.string().optional(),
  projectId: z.string().optional(),
  warehouseId: z.string().optional(),
  status: z.enum(["all", "sesuai", "perhatian", "belum_ada_data"]).optional(),
  groupBy: z.enum(["project", "cluster"]).optional(),
  clusterId: z.string().optional(),
});

const getFilterOptionsSchema = z.object({
  // No query params needed for now, but keeping schema for future extensibility
});

const upsertRemainsNoteSchema = z.object({
  project_id: z.number().int().positive(),
  cluster_id: z.string().nullable().optional(),
  barang_id: z.number().int().positive(),
  keterangan: z.string().max(1000).optional().default(""),
});

module.exports = {
  getReconciliationInventorySchema,
  getFilterOptionsSchema,
  upsertRemainsNoteSchema,
};
