/*
  Warnings:

  - You are about to drop the column `catatan_distribusi` on the `surat_jalan` table. All the data in the column will be lost.
  - You are about to drop the column `estimasi_tiba` on the `surat_jalan` table. All the data in the column will be lost.
  - You are about to drop the column `area` on the `zona_gudang` table. All the data in the column will be lost.
  - Made the column `created_at` on table `surat_jalan_item_foto` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "reconciliation_detail_status" AS ENUM ('berhasil', 'gagal');

-- DropForeignKey
ALTER TABLE "public"."surat_jalan_item_foto" DROP CONSTRAINT "fk_surat_jalan_item_foto_item";

-- DropIndex
DROP INDEX "public"."idx_surat_jalan_item_diperiksa_oleh";

-- DropIndex
DROP INDEX "public"."idx_zona_gudang_dinilai_oleh";

-- AlterTable
ALTER TABLE "surat_jalan" DROP COLUMN "catatan_distribusi",
DROP COLUMN "estimasi_tiba";

-- AlterTable
ALTER TABLE "surat_jalan_item" ALTER COLUMN "diperiksa_pada" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "surat_jalan_item_foto" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "zona_gudang" DROP COLUMN "area",
ALTER COLUMN "dinilai_pada" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "reconciliation_upload_log" (
    "upload_id" BIGSERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "file_url" TEXT,
    "uploaded_by" BIGINT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_rows" INTEGER NOT NULL,
    "success_rows" INTEGER NOT NULL,
    "failed_rows" INTEGER NOT NULL,

    CONSTRAINT "reconciliation_upload_log_pkey" PRIMARY KEY ("upload_id")
);

-- CreateTable
CREATE TABLE "reconciliation_upload_detail" (
    "detail_id" BIGSERIAL NOT NULL,
    "upload_id" BIGINT NOT NULL,
    "kode_tiket" TEXT NOT NULL,
    "mos" DECIMAL(14,2) NOT NULL,
    "used" DECIMAL(14,2) NOT NULL,
    "status" "reconciliation_detail_status" NOT NULL,
    "reason" TEXT,

    CONSTRAINT "reconciliation_upload_detail_pkey" PRIMARY KEY ("detail_id")
);

-- CreateIndex
CREATE INDEX "reconciliation_upload_log_uploaded_at_idx" ON "reconciliation_upload_log"("uploaded_at");

-- CreateIndex
CREATE INDEX "reconciliation_upload_detail_upload_id_idx" ON "reconciliation_upload_detail"("upload_id");

-- RenameForeignKey
ALTER TABLE "stok_gudang" RENAME CONSTRAINT "fk_stok_gudang_zona_id" TO "stok_gudang_zona_id_fkey";

-- RenameForeignKey
ALTER TABLE "surat_jalan_item" RENAME CONSTRAINT "fk_surat_jalan_item_diperiksa_oleh" TO "surat_jalan_item_diperiksa_oleh_fkey";

-- RenameForeignKey
ALTER TABLE "surat_jalan_item" RENAME CONSTRAINT "fk_surat_jalan_item_zona_id" TO "surat_jalan_item_zona_id_fkey";

-- RenameForeignKey
ALTER TABLE "zona_gudang" RENAME CONSTRAINT "fk_zona_gudang_dinilai_oleh" TO "zona_gudang_dinilai_oleh_fkey";

-- AddForeignKey
ALTER TABLE "surat_jalan_item_foto" ADD CONSTRAINT "surat_jalan_item_foto_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "surat_jalan_item"("item_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_upload_log" ADD CONSTRAINT "reconciliation_upload_log_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_upload_detail" ADD CONSTRAINT "reconciliation_upload_detail_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "reconciliation_upload_log"("upload_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_surat_jalan_item_foto_item_id" RENAME TO "surat_jalan_item_foto_item_id_idx";