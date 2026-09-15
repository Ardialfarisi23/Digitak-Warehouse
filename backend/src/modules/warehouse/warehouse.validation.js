const { z } = require("zod");

const createWarehouseSchema = z.object({
  nama_gudang: z
    .string()
    .min(3, "Nama warehouse minimal 3 karakter.")
    .max(100, "Nama warehouse maksimal 100 karakter."),

  alamat: z.string().optional(),
  tipe: z.enum(["tetap", "dadakan"], {
    message: "Tipe warehouse harus diisi: tetap atau dadakan.",
  }),
  project_id: z.number().optional(),
  is_aktif: z.boolean().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  keterangan: z.string().optional(),
  pic_id: z.number().optional(),
}).superRefine((data, ctx) => {
  if (data.tipe === "dadakan" && (data.project_id == null || data.project_id === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["project_id"],
      message: "Gudang Dadakan wajib memiliki Project terkait.",
    });
  }
});

const updateWarehouseSchema = z.object({
  nama_gudang: z
    .string()
    .min(3, "Nama warehouse minimal 3 karakter.")
    .max(100, "Nama warehouse maksimal 100 karakter.")
    .optional(),
  alamat: z.string().optional(),
  tipe: z.enum(["tetap", "dadakan"], {
    message: "Tipe warehouse harus diisi: tetap atau dadakan.",
  }).optional(),
  project_id: z.number().optional(),
  is_aktif: z.boolean().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  keterangan: z.string().optional(),
  pic_id: z.number().optional(),
}).superRefine((data, ctx) => {
  if (data.tipe === "dadakan" && (data.project_id == null || data.project_id === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["project_id"],
      message: "Gudang Dadakan wajib memiliki Project terkait.",
    });
  }
}).refine((data) => Object.keys(data).length > 0, {
  message: "Minimal satu field harus diupdate.",
});

module.exports = {
  createWarehouseSchema,
  updateWarehouseSchema,
};
