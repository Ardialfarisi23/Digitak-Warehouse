const { z } = require("zod");

const getReconciliationInventorySchema = z.object({
  search: z.string().optional(),
  projectId: z.string().optional(),
  warehouseId: z.string().optional(),
  status: z.enum(["all", "sesuai", "berjalan", "perhatian"]).optional(),
});

const updateMosMitraSchema = z.object({
  mos: z.number().min(0, "MOS tidak boleh negatif."),
});

module.exports = {
  getReconciliationInventorySchema,
  updateMosMitraSchema,
};
