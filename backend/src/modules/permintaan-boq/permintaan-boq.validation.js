const { z } = require("zod");

const createPermintaanBoqSchema = z.object({
  projectId: z.string().min(1, "Project wajib dipilih."),
  barang_id: z.string().min(1, "Kode perangkat wajib diisi."),
  qty_usulan: z.number().positive("Qty harus lebih dari 0."),
  alasan: z.string().optional().nullable(),
  tiket_id: z.string().optional().nullable(),
});

const updatePermintaanBoqStatusSchema = z.object({
  status: z.enum(["DIAJUKAN", "DITINJAU", "DISETUJUI", "DITOLAK"]),
});

module.exports = {
  createPermintaanBoqSchema,
  updatePermintaanBoqStatusSchema,
};
