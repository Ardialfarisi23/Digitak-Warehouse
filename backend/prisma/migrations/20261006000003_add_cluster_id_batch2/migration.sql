-- Add cluster_id to permintaan_boq
ALTER TABLE "permintaan_boq" ADD COLUMN "cluster_id" TEXT;

-- Add cluster_id to return_transaction
ALTER TABLE "return_transaction" ADD COLUMN "cluster_id" TEXT;

-- Add cluster_id to laporan_mitra
ALTER TABLE "laporan_mitra" ADD COLUMN "cluster_id" TEXT;

-- Add cluster_id to stok_ledger
ALTER TABLE "stok_ledger" ADD COLUMN "cluster_id" TEXT;

-- Backfill permintaan_boq.cluster_id from tiket_material.cluster_id via tiket_id
UPDATE "permintaan_boq" AS pb
SET "cluster_id" = tm."cluster_id"
FROM "tiket_material" AS tm
WHERE pb."tiket_id" = tm."tiket_id"
  AND pb."cluster_id" IS NULL
  AND tm."cluster_id" IS NOT NULL;

-- Backfill return_transaction.cluster_id from tiket_material.cluster_id via tiket_id
UPDATE "return_transaction" AS rt
SET "cluster_id" = tm."cluster_id"
FROM "tiket_material" AS tm
WHERE rt."tiket_id" = tm."tiket_id"
  AND rt."cluster_id" IS NULL
  AND tm."cluster_id" IS NOT NULL;

-- Backfill return_transaction.cluster_id from surat_jalan_item.cluster_id via surat_jalan_item_id (sisanya)
UPDATE "return_transaction" AS rt
SET "cluster_id" = sji."cluster_id"
FROM "surat_jalan_item" AS sji
WHERE rt."surat_jalan_item_id" = sji."item_id"
  AND rt."cluster_id" IS NULL
  AND sji."cluster_id" IS NOT NULL;

-- Backfill laporan_mitra.cluster_id from tiket_material.cluster_id via tiket_id
UPDATE "laporan_mitra" AS lm
SET "cluster_id" = tm."cluster_id"
FROM "tiket_material" AS tm
WHERE lm."tiket_id" = tm."tiket_id"
  AND lm."cluster_id" IS NULL
  AND tm."cluster_id" IS NOT NULL;

-- Backfill stok_ledger.cluster_id from surat_jalan_item.cluster_id via surat_jalan_item_id
UPDATE "stok_ledger" AS sl
SET "cluster_id" = sji."cluster_id"
FROM "surat_jalan_item" AS sji
WHERE sl."surat_jalan_item_id" = sji."item_id"
  AND sl."cluster_id" IS NULL
  AND sji."cluster_id" IS NOT NULL;

-- Backfill stok_ledger.cluster_id from return_transaction.cluster_id via return_transaction_id (sisanya)
UPDATE "stok_ledger" AS sl
SET "cluster_id" = rt."cluster_id"
FROM "return_transaction" AS rt
WHERE sl."return_transaction_id" = rt."return_id"
  AND sl."cluster_id" IS NULL
  AND rt."cluster_id" IS NOT NULL;

-- Add FK constraints (NOT VALID untuk kecepatan)
ALTER TABLE "permintaan_boq"
  ADD CONSTRAINT "permintaan_boq_cluster_id_fkey"
  FOREIGN KEY ("cluster_id")
  REFERENCES "cluster"("cluster_id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "return_transaction"
  ADD CONSTRAINT "return_transaction_cluster_id_fkey"
  FOREIGN KEY ("cluster_id")
  REFERENCES "cluster"("cluster_id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "laporan_mitra"
  ADD CONSTRAINT "laporan_mitra_cluster_id_fkey"
  FOREIGN KEY ("cluster_id")
  REFERENCES "cluster"("cluster_id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE
  NOT VALID;

ALTER TABLE "stok_ledger"
  ADD CONSTRAINT "stok_ledger_cluster_id_fkey"
  FOREIGN KEY ("cluster_id")
  REFERENCES "cluster"("cluster_id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE
  NOT VALID;

-- Add FK constraint for tiket_material.cluster_id (kolom sudah ada)
ALTER TABLE "tiket_material"
  ADD CONSTRAINT "tiket_material_cluster_id_fkey"
  FOREIGN KEY ("cluster_id")
  REFERENCES "cluster"("cluster_id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE
  NOT VALID;

-- Create indexes
CREATE INDEX "permintaan_boq_cluster_id_idx" ON "permintaan_boq"("cluster_id");
CREATE INDEX "return_transaction_cluster_id_idx" ON "return_transaction"("cluster_id");
CREATE INDEX "laporan_mitra_cluster_id_idx" ON "laporan_mitra"("cluster_id");
CREATE INDEX "stok_ledger_cluster_id_idx" ON "stok_ledger"("cluster_id");
