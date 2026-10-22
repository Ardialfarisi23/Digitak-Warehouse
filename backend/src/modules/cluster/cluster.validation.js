const { z } = require("zod");

const createClusterSchema = z.object({
  cluster_id: z.string().min(1, "Cluster ID wajib diisi."),
  project_id: z.number().min(1, "Project wajib dipilih."),
  nama_cluster: z.string().min(1, "Nama cluster wajib diisi."),
  cluster_type: z.string().optional().nullable(),
  status_aktif: z.boolean().optional().nullable(),
  project_type: z.string().optional().nullable(),
  kso_partner: z.string().optional().nullable(),
  kso_contact: z.string().optional().nullable(),
  no_tiket_release: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  alamat_lengkap: z.string().optional().nullable(),
  homepass_plan: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const n = Number(val);
      return Number.isNaN(n) ? null : n;
    },
    z.number().int().min(0).optional().nullable()
  ),
  pic_id: z.string().optional().nullable(),
});

const updateClusterSchema = z.object({
  nama_cluster: z.string().min(1, "Nama cluster wajib diisi.").optional(),
  cluster_type: z.string().optional().nullable(),
  alamat_lengkap: z.string().optional().nullable(),
  homepass_plan: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const n = Number(val);
      return Number.isNaN(n) ? null : n;
    },
    z.number().int().min(0).optional().nullable()
  ),
  pic_id: z.string().optional().nullable(),
});

module.exports = {
  createClusterSchema,
  updateClusterSchema,
};
