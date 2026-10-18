const { z } = require("zod");

const safeUrlSchema = z
  .string()
  .optional()
  .nullable()
  .refine(
    (val) => {
      if (!val) return true;
      const trimmed = val.trim();
      try {
        const url = new URL(trimmed);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\");
      }
    },
    { message: "Format URL foto tidak valid." }
  );

const createVehicleSchema = z.object({
  jenis_kendaraan: z.string().min(3, "Jenis kendaraan minimal 3 karakter.").max(50, "Jenis kendaraan maksimal 50 karakter."),
  merk: z.string().optional(),
  no_polisi: z.string().min(3, "No. polisi minimal 3 karakter.").max(20, "No. polisi maksimal 20 karakter."),
  kapasitas_angkut: z.string().optional(),
  keterangan: z.string().optional(),
  foto: safeUrlSchema,
  gudang_id: z.coerce.number().int().positive("Gudang tidak valid.").optional().nullable(),
  gudangId: z.coerce.number().int().positive("Gudang tidak valid.").optional().nullable(),
  warehouseId: z.coerce.number().int().positive("Gudang tidak valid.").optional().nullable(),
  gudangName: z.string().optional().nullable(),
});

const updateVehicleSchema = createVehicleSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

module.exports = {
  createVehicleSchema,
  updateVehicleSchema,
};
