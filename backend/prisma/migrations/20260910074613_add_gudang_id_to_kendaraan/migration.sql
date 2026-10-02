-- AlterTable
ALTER TABLE "kendaraan" ADD COLUMN     "gudang_id" BIGINT;

-- AlterTable
ALTER TABLE "personil" ADD COLUMN     "is_aktif" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "kendaraan_gudang_id_idx" ON "kendaraan"("gudang_id");

-- AddForeignKey
ALTER TABLE "kendaraan" ADD CONSTRAINT "kendaraan_gudang_id_fkey" FOREIGN KEY ("gudang_id") REFERENCES "gudang"("gudang_id") ON DELETE SET NULL ON UPDATE CASCADE;
