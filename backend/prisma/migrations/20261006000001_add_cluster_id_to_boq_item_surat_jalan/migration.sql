-- Add cluster_id to boq_item
ALTER TABLE "boq_item" ADD COLUMN "cluster_id" TEXT;

-- Add cluster_id to surat_jalan
ALTER TABLE "surat_jalan" ADD COLUMN "cluster_id" TEXT;

-- Add cluster_id to surat_jalan_item
ALTER TABLE "surat_jalan_item" ADD COLUMN "cluster_id" TEXT;

-- Backfill boq_item.cluster_id from boq.cluster_id via boq_item.boq_id
UPDATE "boq_item" AS bi
SET "cluster_id" = b."cluster_id"
FROM "boq" AS b
WHERE bi."boq_id" = b."boq_id"
  AND bi."cluster_id" IS NULL
  AND b."cluster_id" IS NOT NULL;

-- Backfill surat_jalan.cluster_id from boq.cluster_id via surat_jalan.boq_id
UPDATE "surat_jalan" AS sj
SET "cluster_id" = b."cluster_id"
FROM "boq" AS b
WHERE sj."boq_id" = b."boq_id"
  AND sj."cluster_id" IS NULL
  AND b."cluster_id" IS NOT NULL;

-- Backfill surat_jalan_item.cluster_id from surat_jalan.cluster_id via surat_jalan_item.surat_jalan_id
UPDATE "surat_jalan_item" AS sji
SET "cluster_id" = sj."cluster_id"
FROM "surat_jalan" AS sj
WHERE sji."surat_jalan_id" = sj."surat_jalan_id"
  AND sji."cluster_id" IS NULL
  AND sj."cluster_id" IS NOT NULL;

-- Add FK constraint: boq_item.cluster_id -> cluster.cluster_id
ALTER TABLE "boq_item"
  ADD CONSTRAINT "boq_item_cluster_id_fkey"
  FOREIGN KEY ("cluster_id")
  REFERENCES "cluster"("cluster_id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE
  NOT VALID;

-- Add FK constraint: surat_jalan.cluster_id -> cluster.cluster_id
ALTER TABLE "surat_jalan"
  ADD CONSTRAINT "surat_jalan_cluster_id_fkey"
  FOREIGN KEY ("cluster_id")
  REFERENCES "cluster"("cluster_id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE
  NOT VALID;

-- Add FK constraint: surat_jalan_item.cluster_id -> cluster.cluster_id
ALTER TABLE "surat_jalan_item"
  ADD CONSTRAINT "surat_jalan_item_cluster_id_fkey"
  FOREIGN KEY ("cluster_id")
  REFERENCES "cluster"("cluster_id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE
  NOT VALID;

-- Create indexes
CREATE INDEX "boq_item_cluster_id_idx" ON "boq_item"("cluster_id");
CREATE INDEX "surat_jalan_cluster_id_idx" ON "surat_jalan"("cluster_id");
CREATE INDEX "surat_jalan_item_cluster_id_idx" ON "surat_jalan_item"("cluster_id");
