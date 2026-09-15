-- AlterTable
ALTER TABLE "surat_jalan" ADD COLUMN     "supplier_id" BIGINT;

-- AddForeignKey
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id") ON DELETE SET NULL ON UPDATE CASCADE;
