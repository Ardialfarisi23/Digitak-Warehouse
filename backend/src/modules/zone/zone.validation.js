const { z } = require("zod");

const createZoneSchema = z.object({
  code: z.string().min(1, "Kode zone wajib diisi.").max(20, "Kode maksimal 20 karakter."),
  name: z.string().min(1, "Nama zone wajib diisi.").max(100, "Nama maksimal 100 karakter."),
  description: z.string().optional(),
  gudang_id: z.string().optional(),
  tipe_zona: z.string().optional(),
  kapasitas_maksimum: z.union([
    z.coerce.number().int().positive("Kapasitas harus lebih dari 0"),
    z.literal(null),
  ]).optional(),
});

const updateZoneSchema = createZoneSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

const updateZoneUtilizationSchema = z.object({
  status_kecukupan: z.enum(["CUKUP", "MENDEKATI_PENUH", "TIDAK_CUKUP"]).optional(),
  kapasitas_maksimum: z.union([
    z.coerce.number().int().positive("Kapasitas harus lebih dari 0"),
    z.literal(null),
  ]).optional(),
}).refine((data) => data.status_kecukupan !== undefined || data.kapasitas_maksimum !== undefined, {
  message: "Minimal satu field harus diisi.",
});

module.exports = {
  createZoneSchema,
  updateZoneSchema,
  updateZoneUtilizationSchema,
};
