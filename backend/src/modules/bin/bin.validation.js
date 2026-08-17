const { z } = require("zod");

const createBinSchema = z.object({
  code: z.string().min(3, "Kode minimal 3 karakter.").max(20, "Kode maksimal 20 karakter."),
  name: z.string().min(3, "Nama minimal 3 karakter.").max(100, "Nama maksimal 100 karakter."),
  description: z.string().optional(),
  rak_id: z.string().optional(),
});

const updateBinSchema = createBinSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

module.exports = {
  createBinSchema,
  updateBinSchema,
};
