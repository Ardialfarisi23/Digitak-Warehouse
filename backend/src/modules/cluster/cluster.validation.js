const { z } = require("zod");

const createClusterSchema = z.object({
  cluster_id: z.string().min(1, "Cluster ID wajib diisi."),
  project_id: z.string().min(1, "Project wajib dipilih."),
  nama_cluster: z.string().min(1, "Nama cluster wajib diisi."),
  cluster_type: z.string().optional().nullable(),
  project_type: z.string().optional().nullable(),
  kso_partner: z.string().optional().nullable(),
  kso_contact: z.string().optional().nullable(),
  no_tiket_release: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  alamat_lengkap: z.string().optional().nullable(),
});

const updateClusterSchema = z.object({
  nama_cluster: z.string().min(1, "Nama cluster wajib diisi.").optional(),
  cluster_type: z.string().optional().nullable(),
  alamat_lengkap: z.string().optional().nullable(),
});

module.exports = {
  createClusterSchema,
  updateClusterSchema,
};
