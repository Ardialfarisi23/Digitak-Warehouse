const { z } = require("zod");

const createWarehouseSchema = z.object({
  nama_gudang: z
    .string()
    .min(3, "Nama warehouse minimal 3 karakter.")
    .max(100, "Nama warehouse maksimal 100 karakter."),

  alamat: z.string().optional(),
  tipe: z.string().optional(),
  is_aktif: z.boolean().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  keterangan: z.string().optional(),
  pic_id: z.number().optional(),
});

const updateWarehouseSchema = createWarehouseSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

module.exports = {
  createWarehouseSchema,
  updateWarehouseSchema,
};
