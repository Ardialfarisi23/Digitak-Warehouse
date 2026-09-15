const { z } = require("zod");

const updateProfileSchema = z
  .object({
    nama: z.string().min(3, "Nama minimal 3 karakter.").max(100, "Nama maksimal 100 karakter.").optional(),
    no_hp: z.string().min(8, "No. HP minimal 8 digit.").max(20, "No. HP maksimal 20 digit.").optional(),
    password: z.string().min(6, "Password minimal 6 karakter.").optional(),
    warehouseId: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus diupdate.",
  });

module.exports = {
  updateProfileSchema,
};
