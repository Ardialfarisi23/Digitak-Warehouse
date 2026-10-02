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
}).superRefine((data, ctx) => {
  const role = data.role;

  if (role === "staf_gudang") {
    const gudangId = data.gudang_id;

    if (gudangId === undefined || gudangId === null || gudangId === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gudang_id"],
        message: "Gudang yang ditugaskan wajib diisi untuk role Staf Gudang.",
      });
    }
  }
});

const updateUserSchema = z.object({
  nama: createUserSchema.shape.nama.optional(),
  email: createUserSchema.shape.email.optional(),
  password: createUserSchema.shape.password.optional(),
  role: createUserSchema.shape.role.optional(),
  is_aktif: createUserSchema.shape.is_aktif.optional(),
  no_telepon: createUserSchema.shape.no_telepon.optional().nullable(),
  gudang_id: createUserSchema.shape.gudang_id.optional().nullable(),
  personil_id: createUserSchema.shape.personil_id.optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.role === "staf_gudang") {
    const gudangId = data.gudang_id;
    if (gudangId === undefined || gudangId === null || gudangId === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gudang_id"],
        message: "Gudang yang ditugaskan wajib diisi untuk role Staf Gudang.",
      });
    }
  }
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined && v !== null && v !== ""),
  {
    message: "Minimal satu field harus diupdate.",
  }
);

module.exports = {
  createUserSchema,
  updateUserSchema,
};
