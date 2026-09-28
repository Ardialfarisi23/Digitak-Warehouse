const { z } = require("zod");

const getReconciliationInventorySchema = z.object({
  search: z.string().optional(),
  projectId: z.string().optional(),
  warehouseId: z.string().optional(),
  status: z.enum(["all", "sesuai", "perhatian", "belum_ada_data"]).optional(),
});

module.exports = {
  getReconciliationInventorySchema,
};
