/*
  Warnings:

  - The `kondisi_diterima` column on the `surat_jalan_item` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "public"."reconciliation_upload_detail" DROP CONSTRAINT "reconciliation_upload_detail_upload_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."stok_ledger" DROP CONSTRAINT "stok_ledger_surat_jalan_item_id_fkey";

-- DropIndex
DROP INDEX "public"."cluster_pic_id_idx";

-- AlterTable
ALTER TABLE "surat_jalan" ALTER COLUMN "dilaporkan_tiba_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "dikonfirmasi_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "surat_jalan_item" DROP COLUMN "kondisi_diterima",
ADD COLUMN     "kondisi_diterima" "kondisi_barang";

-- AlterTable
ALTER TABLE "surat_jalan_item_unit" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "surat_jalan_transit" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "boq_item_gudang_tujuan_id_idx" ON "boq_item"("gudang_tujuan_id");

-- CreateIndex
CREATE INDEX "stok_gudang_zona_id_idx" ON "stok_gudang"("zona_id");

-- CreateIndex
CREATE INDEX "surat_jalan_tipe_idx" ON "surat_jalan"("tipe");

-- CreateIndex
CREATE INDEX "surat_jalan_created_at_idx" ON "surat_jalan"("created_at");

-- CreateIndex
CREATE INDEX "surat_jalan_item_barang_id_idx" ON "surat_jalan_item"("barang_id");

-- AddForeignKey
ALTER TABLE "boq" ADD CONSTRAINT "boq_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "cluster"("cluster_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_ledger" ADD CONSTRAINT "stok_ledger_surat_jalan_item_id_fkey" FOREIGN KEY ("surat_jalan_item_id") REFERENCES "surat_jalan_item"("item_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_upload_detail" ADD CONSTRAINT "reconciliation_upload_detail_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "reconciliation_upload_log"("upload_id") ON DELETE CASCADE ON UPDATE CASCADE;
