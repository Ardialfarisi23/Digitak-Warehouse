const { z } = require("zod");

const createAdjustmentSchema = z.object({
  project_id: z.coerce.number().int().min(1, "Project ID tidak valid."),
  barang_id: z.coerce.number().int().min(1, "Barang ID tidak valid."),
  qty: z.coerce.number().int("Qty harus bilangan bulat.").refine((val) => val !== 0, {
    message: "Qty tidak boleh 0.",
  }),
  alasan: z.string().min(5, "Alasan wajib diisi, minimal 5 karakter.").max(500, "Alasan maksimal 500 karakter."),
});

const listAdjustmentsSchema = z.object({
  project_id: z.coerce.number().int().min(1, "Project ID tidak valid.").optional(),
  barang_id: z.coerce.number().int().min(1, "Barang ID tidak valid.").optional(),
});

module.exports = {
  createAdjustmentSchema,
  listAdjustmentsSchema,
};
