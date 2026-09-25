-- AlterTable
ALTER TABLE "laporan_mitra" ADD COLUMN "barang_id" BigInt;

-- AlterTable
ALTER TABLE "reconciliation_upload_detail" ADD COLUMN "barang_id" BigInt;

-- AddForeignKey
ALTER TABLE "laporan_mitra" ADD CONSTRAINT "laporan_mitra_barang_id_fkey" FOREIGN KEY ("barang_id") REFERENCES "barang"("barang_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_upload_detail" ADD CONSTRAINT "reconciliation_upload_detail_barang_id_fkey" FOREIGN KEY ("barang_id") REFERENCES "barang"("barang_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "laporan_mitra_barang_id_idx" ON "laporan_mitra"("barang_id");

-- CreateIndex
CREATE INDEX "reconciliation_upload_detail_barang_id_idx" ON "reconciliation_upload_detail"("barang_id");
