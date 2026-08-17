const { z } = require("zod");

const createVehicleSchema = z.object({
  jenis_kendaraan: z.string().min(3, "Jenis kendaraan minimal 3 karakter.").max(50, "Jenis kendaraan maksimal 50 karakter."),
  merk: z.string().optional(),
  no_polisi: z.string().min(3, "No. polisi minimal 3 karakter.").max(20, "No. polisi maksimal 20 karakter."),
  kapasitas_angkut: z.string().optional(),
  keterangan: z.string().optional(),
  foto: z.string().url("Format URL foto tidak valid.").optional().nullable(),
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
