/*
  Versi IDEMPOTEN (perbaikan pemulihan setelah percobaan pertama gagal di
  CREATE INDEX "boq_item_gudang_tujuan_id_idx" karena index itu sudah dibuat
  oleh migration lama).

  Setiap statement dibuat aman dijalankan pada kondisi DB campuran (sebagian
  objek sudah ada dari migration sebelumnya, sebagian belum):
  - DROP CONSTRAINT / DROP INDEX -> IF EXISTS
  - CREATE INDEX -> IF NOT EXISTS
  - ADD CONSTRAINT -> dibungkus blok DO $$ bila belum ada
  - kondisi_diterima TIDAK di-drop/recreate lagi: memakai ALTER COLUMN TYPE
    ... USING supaya data yang sudah terisi tetap dipertahankan.
*/

-- DropForeignKey
ALTER TABLE "public"."reconciliation_upload_detail" DROP CONSTRAINT IF EXISTS "reconciliation_upload_detail_upload_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."stok_ledger" DROP CONSTRAINT IF EXISTS "stok_ledger_surat_jalan_item_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "public"."cluster_pic_id_idx";

-- AlterTable
ALTER TABLE "surat_jalan" ALTER COLUMN "dilaporkan_tiba_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "dikonfirmasi_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
-- Tidak DROP+ADD (menjaga data). Konversi teks -> enum "kondisi_barang".
ALTER TABLE "surat_jalan_item" ALTER COLUMN "kondisi_diterima" TYPE "kondisi_barang" USING "kondisi_diterima"::text::"kondisi_barang";

-- AlterTable
ALTER TABLE "surat_jalan_item_unit" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "surat_jalan_transit" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "boq_item_gudang_tujuan_id_idx" ON "boq_item"("gudang_tujuan_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stok_gudang_zona_id_idx" ON "stok_gudang"("zona_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "surat_jalan_tipe_idx" ON "surat_jalan"("tipe");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "surat_jalan_created_at_idx" ON "surat_jalan"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "surat_jalan_item_barang_id_idx" ON "surat_jalan_item"("barang_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'boq_cluster_id_fkey'
  ) THEN
    ALTER TABLE "boq" ADD CONSTRAINT "boq_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "cluster"("cluster_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stok_ledger_surat_jalan_item_id_fkey'
  ) THEN
    ALTER TABLE "stok_ledger" ADD CONSTRAINT "stok_ledger_surat_jalan_item_id_fkey" FOREIGN KEY ("surat_jalan_item_id") REFERENCES "surat_jalan_item"("item_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reconciliation_upload_detail_upload_id_fkey'
  ) THEN
    ALTER TABLE "reconciliation_upload_detail" ADD CONSTRAINT "reconciliation_upload_detail_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "reconciliation_upload_log"("upload_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
