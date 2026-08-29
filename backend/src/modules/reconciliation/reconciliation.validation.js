const { z } = require("zod");

const getReconciliationInventorySchema = z.object({
  search: z.string().optional(),
  projectId: z.string().optional(),
  warehouseId: z.string().optional(),
  status: z.enum(["all", "sesuai", "berjalan", "perhatian"]).optional(),
});

const updateMosMitraSchema = z.object({
  mos: z
    .number({ invalid_type_error: "MOS Laporan Mitra harus berupa angka." })
    .nonnegative("MOS Laporan Mitra tidak boleh negatif."),
});

module.exports = {
  getReconciliationInventorySchema,
  updateMosMitraSchema,
};
