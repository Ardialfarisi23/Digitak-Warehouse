-- CreateEnum
CREATE TYPE "tujuan_tipe_enum" AS ENUM ('lapangan', 'gudang');

-- CreateEnum
CREATE TYPE "tipe_pengirim_enum" AS ENUM ('internal', 'external');

-- AlterTable
ALTER TABLE "gudang" ADD COLUMN     "is_internal" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "surat_jalan" ADD COLUMN     "pengirim_eksternal_nama" TEXT,
ADD COLUMN     "tipe_pengirim" "tipe_pengirim_enum",
ADD COLUMN     "titik_lapangan_id" BIGINT,
ADD COLUMN     "tujuan_tipe" "tujuan_tipe_enum";

-- CreateTable
CREATE TABLE "titik_lapangan" (
    "titik_lapangan_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "nama_lokasi" TEXT NOT NULL,
    "latitude" TEXT,
    "longitude" TEXT,
    "alamat" TEXT,
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT NOT NULL,

    CONSTRAINT "titik_lapangan_pkey" PRIMARY KEY ("titik_lapangan_id")
);

-- CreateIndex
CREATE INDEX "titik_lapangan_project_id_idx" ON "titik_lapangan"("project_id");

-- AddForeignKey
ALTER TABLE "titik_lapangan" ADD CONSTRAINT "titik_lapangan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titik_lapangan" ADD CONSTRAINT "titik_lapangan_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titik_lapangan" ADD CONSTRAINT "titik_lapangan_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_titik_lapangan_id_fkey" FOREIGN KEY ("titik_lapangan_id") REFERENCES "titik_lapangan"("titik_lapangan_id") ON DELETE SET NULL ON UPDATE CASCADE;
