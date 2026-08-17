const { z } = require("zod");

const createUserSchema = z.object({
  nama: z.string().min(3, "Nama minimal 3 karakter.").max(100, "Nama maksimal 100 karakter."),
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
  role: z.enum(["admin_general", "supervisor", "staf_gudang"]),
  is_aktif: z.boolean().optional(),
  no_telepon: z.string().optional().nullable(),
  gudang_id: z.union([z.string(), z.number()]).optional().nullable(),
  personil_id: z.union([z.string(), z.number()]).optional().nullable(),
});

const updateUserSchema = createUserSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

module.exports = {
  createUserSchema,
  updateUserSchema,
};
