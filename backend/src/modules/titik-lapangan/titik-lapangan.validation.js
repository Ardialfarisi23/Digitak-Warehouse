const { z } = require("zod");

const createTitikLapanganSchema = z.object({
  project_id: z.coerce.number().positive("Project wajib diisi."),
  nama_lokasi: z.string().min(1, "Nama lokasi wajib diisi."),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  alamat: z.string().optional().nullable(),
  is_aktif: z.boolean().optional(),
});

const updateTitikLapanganSchema = createTitikLapanganSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

module.exports = {
  createTitikLapanganSchema,
  updateTitikLapanganSchema,
};
