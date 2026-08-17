const { z } = require("zod");

const createPersonnelSchema = z.object({
  nama: z
    .string()
    .min(3, "Nama minimal 3 karakter.")
    .max(100, "Nama maksimal 100 karakter."),

  jenis: z
    .enum(["admin_gudang", "teknisi", "supervisor"])
    .optional(),

  no_hp: z
    .string()
    .max(30)
    .optional()
    .nullable(),

  nik: z
    .string()
    .max(30)
    .optional()
    .nullable(),

  email: z
    .string()
    .email("Format email tidak valid.")
    .optional()
    .nullable(),

  posisi: z
    .string()
    .max(100)
    .optional()
    .nullable(),

  bisa_menyetir: z
    .boolean()
    .optional(),

  is_material_handler: z
    .boolean()
    .optional(),

  foto: z
    .string()
    .url("Format URL foto tidak valid.")
    .optional()
    .nullable(),

});

const updatePersonnelSchema =
  createPersonnelSchema
    .partial()
    .refine(
      (data) => Object.keys(data).length > 0,
      {
        message: "Minimal satu field harus diupdate.",
      }
    );

module.exports = {
  createPersonnelSchema,
  updatePersonnelSchema,
};
