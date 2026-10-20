-- BUG-12 Step 2: soft delete columns for barang & kendaraan
-- Adds is_aktif, deleted_at, deleted_by (+ FK to user_account ON DELETE SET NULL)
-- and index on is_aktif. Unique constraints on kode_perangkat / no_polisi
-- dipertahankan (tidak diubah ke partial unique index) karena lookup findUnique
-- dengan where { kode_perangkat } / { no_polisi } masih dipakai di repository.

-- AlterTable barang
ALTER TABLE "barang" ADD COLUMN "is_aktif" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "barang" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "barang" ADD COLUMN "deleted_by" BIGINT;

-- AlterTable kendaraan
ALTER TABLE "kendaraan" ADD COLUMN "is_aktif" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "kendaraan" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "kendaraan" ADD COLUMN "deleted_by" BIGINT;

-- Foreign keys
ALTER TABLE "barang" ADD CONSTRAINT "barang_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kendaraan" ADD CONSTRAINT "kendaraan_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "barang_is_aktif_idx" ON "barang"("is_aktif");
CREATE INDEX "kendaraan_is_aktif_idx" ON "kendaraan"("is_aktif");
