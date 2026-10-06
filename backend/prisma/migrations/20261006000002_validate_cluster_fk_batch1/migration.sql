-- Validate FK constraints added in batch 1
ALTER TABLE "boq_item" VALIDATE CONSTRAINT "boq_item_cluster_id_fkey";
ALTER TABLE "surat_jalan" VALIDATE CONSTRAINT "surat_jalan_cluster_id_fkey";
ALTER TABLE "surat_jalan_item" VALIDATE CONSTRAINT "surat_jalan_item_cluster_id_fkey";
