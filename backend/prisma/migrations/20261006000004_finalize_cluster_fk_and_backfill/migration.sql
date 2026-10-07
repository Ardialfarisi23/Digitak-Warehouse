-- Bagian 1: VALIDATE CONSTRAINT batch 2
ALTER TABLE "permintaan_boq" VALIDATE CONSTRAINT "permintaan_boq_cluster_id_fkey";
ALTER TABLE "return_transaction" VALIDATE CONSTRAINT "return_transaction_cluster_id_fkey";
ALTER TABLE "laporan_mitra" VALIDATE CONSTRAINT "laporan_mitra_cluster_id_fkey";
ALTER TABLE "stok_ledger" VALIDATE CONSTRAINT "stok_ledger_cluster_id_fkey";
ALTER TABLE "tiket_material" VALIDATE CONSTRAINT "tiket_material_cluster_id_fkey";

-- Bagian 3b: Backfill surat_jalan untuk project dengan TEPAT SATU cluster
-- 19 surat_jalan: project_id NOT NULL, boq_id NULL, cluster_id NULL, dan project punya tepat 1 cluster
UPDATE "surat_jalan" AS sj
SET "cluster_id" = c."cluster_id"
FROM "cluster" c
WHERE sj."cluster_id" IS NULL
  AND sj."boq_id" IS NULL
  AND sj."project_id" IS NOT NULL
  AND c."project_id" = sj."project_id"
  AND (
    SELECT COUNT(*) FROM "cluster" c2 WHERE c2."project_id" = sj."project_id"
  ) = 1;

-- Backfill surat_jalan_item dari surat_jalan (yang baru terisi)
UPDATE "surat_jalan_item" AS sji
SET "cluster_id" = sj."cluster_id"
FROM "surat_jalan" AS sj
WHERE sji."cluster_id" IS NULL
  AND sji."surat_jalan_id" = sj."surat_jalan_id"
  AND sj."cluster_id" IS NOT NULL;

-- Backfill stok_ledger dari surat_jalan_item (yang baru terisi)
UPDATE "stok_ledger" AS sl
SET "cluster_id" = sji."cluster_id"
FROM "surat_jalan_item" AS sji
WHERE sl."cluster_id" IS NULL
  AND sl."surat_jalan_item_id" = sji."item_id"
  AND sji."cluster_id" IS NOT NULL;

-- Backfill stok_ledger dari return_transaction (sisanya)
UPDATE "stok_ledger" AS sl
SET "cluster_id" = rt."cluster_id"
FROM "return_transaction" AS rt
WHERE sl."cluster_id" IS NULL
  AND sl."return_transaction_id" = rt."return_id"
  AND rt."cluster_id" IS NOT NULL;
