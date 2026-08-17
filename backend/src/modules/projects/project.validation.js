const { z } = require("zod");

const createProjectSchema = z.object({
  nama_project: z.string().min(3, "Nama project minimal 3 karakter.").max(100, "Nama project maksimal 100 karakter."),
  title: z.string().optional().nullable(),
  cluster_id: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  klien: z.string().optional().nullable(),
  kecamatan: z.string().optional().nullable(),
  desa_kelurahan: z.string().optional().nullable(),
  kota_kabupaten: z.string().optional().nullable(),
  provinsi: z.string().optional().nullable(),
  status_aktif: z.boolean().optional(),
});

const updateProjectSchema = createProjectSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

module.exports = {
  createProjectSchema,
  updateProjectSchema,
};
