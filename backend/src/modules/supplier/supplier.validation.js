const { z } = require("zod");

const createSupplierSchema = z.object({
  kode: z.string().min(3, "Kode minimal 3 karakter.").max(20, "Kode maksimal 20 karakter."),
  nama: z.string().min(3, "Nama minimal 3 karakter.").max(100, "Nama maksimal 100 karakter."),
  deskripsi: z.string().optional(),
});

const updateSupplierSchema = createSupplierSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

module.exports = {
  createSupplierSchema,
  updateSupplierSchema,
};
