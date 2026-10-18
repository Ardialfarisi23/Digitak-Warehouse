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

const createItemSchema = z.object({
  kode_perangkat: z.string().min(3, "Kode minimal 3 karakter.").max(50, "Kode maksimal 50 karakter."),
  nama_barang: z.string().min(3, "Nama minimal 3 karakter.").max(150, "Nama maksimal 150 karakter."),
  kategori_id: z.number().optional(),
  satuan_default_id: z.number().optional(),
  foto: safeUrlSchema,
  wajib_sn: z.boolean().optional(),
});

const updateItemSchema = createItemSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

module.exports = {
  createItemSchema,
  updateItemSchema,
};
