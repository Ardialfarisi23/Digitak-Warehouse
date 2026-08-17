const { z } = require("zod");

const createItemSchema = z.object({
  kode_perangkat: z.string().min(3, "Kode minimal 3 karakter.").max(50, "Kode maksimal 50 karakter."),
  nama_barang: z.string().min(3, "Nama minimal 3 karakter.").max(150, "Nama maksimal 150 karakter."),
  kategori_id: z.number().optional(),
  satuan_default_id: z.number().optional(),
  foto: z.string().url("Format URL foto tidak valid.").optional().nullable(),
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
