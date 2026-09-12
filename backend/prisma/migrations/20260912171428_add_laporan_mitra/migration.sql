-- CreateEnum
CREATE TYPE "jenis_laporan_enum" AS ENUM ('excel', 'manual', 'migrasi_sistem');

-- CreateTable
CREATE TABLE "laporan_mitra" (
    "laporan_id" BIGSERIAL NOT NULL,
    "tiket_id" BIGINT NOT NULL,
    "kode_tiket" TEXT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "jenis_laporan" "jenis_laporan_enum" NOT NULL,
    "tanggal_laporan" DATE NOT NULL,
    "pic_mitra" TEXT,
    "nama_barang" TEXT,
    "mos" DECIMAL(14,2) NOT NULL,
    "used" DECIMAL(14,2) NOT NULL,
    "catatan" TEXT,
    "kondisi" TEXT,
    "uploaded_by" BIGINT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "laporan_mitra_pkey" PRIMARY KEY ("laporan_id")
);

-- CreateIndex
CREATE INDEX "laporan_mitra_tiket_id_idx" ON "laporan_mitra"("tiket_id");

-- CreateIndex
CREATE INDEX "laporan_mitra_project_id_idx" ON "laporan_mitra"("project_id");

-- CreateIndex
CREATE INDEX "laporan_mitra_tanggal_laporan_idx" ON "laporan_mitra"("tanggal_laporan");

-- CreateIndex
CREATE INDEX "laporan_mitra_uploaded_at_idx" ON "laporan_mitra"("uploaded_at");

-- AddForeignKey
ALTER TABLE "laporan_mitra" ADD CONSTRAINT "laporan_mitra_tiket_id_fkey" FOREIGN KEY ("tiket_id") REFERENCES "tiket_material"("tiket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_mitra" ADD CONSTRAINT "laporan_mitra_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_mitra" ADD CONSTRAINT "laporan_mitra_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
