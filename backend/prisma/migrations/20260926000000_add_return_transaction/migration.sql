-- CreateEnum
CREATE TYPE "return_status" AS ENUM ('draft', 'diajukan', 'disetujui', 'diterima_gudang', 'ditolak');

-- AlterEnum
ALTER TYPE "approval_entity_type" ADD VALUE IF NOT EXISTS 'return_transaction';

-- AlterEnum
ALTER TYPE "approval_tahap" ADD VALUE IF NOT EXISTS 'return_approval';
ALTER TYPE "approval_tahap" ADD VALUE IF NOT EXISTS 'return_receive';

-- CreateTable
CREATE TABLE "return_transaction" (
    "return_id" BIGSERIAL NOT NULL,
    "tiket_id" BIGINT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "barang_id" BIGINT NOT NULL,
    "baseline_laporan_id" BIGINT NOT NULL,
    "surat_jalan_item_id" BIGINT,
    "qty" DECIMAL(14,2) NOT NULL,
    "status" "return_status" NOT NULL DEFAULT 'draft',
    "effective_return_at" TIMESTAMP(3) NOT NULL,
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" BIGINT,
    "approved_at" TIMESTAMP(3),
    "received_by" BIGINT,
    "received_at" TIMESTAMP(3),
    "note" TEXT,
    "reason" TEXT,

    CONSTRAINT "return_transaction_pkey" PRIMARY KEY ("return_id")
);

-- CreateIndex
CREATE INDEX "return_transaction_tiket_id_barang_id_status_effective_retu_idx" ON "return_transaction"("tiket_id", "barang_id", "status", "effective_return_at");

-- CreateIndex
CREATE INDEX "return_transaction_baseline_laporan_id_idx" ON "return_transaction"("baseline_laporan_id");

-- CreateIndex
CREATE INDEX "return_transaction_surat_jalan_item_id_idx" ON "return_transaction"("surat_jalan_item_id");

-- CreateIndex
CREATE INDEX "return_transaction_created_at_idx" ON "return_transaction"("created_at");

-- AddForeignKey
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_tiket_id_fkey" FOREIGN KEY ("tiket_id") REFERENCES "tiket_material"("tiket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_barang_id_fkey" FOREIGN KEY ("barang_id") REFERENCES "barang"("barang_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_baseline_laporan_id_fkey" FOREIGN KEY ("baseline_laporan_id") REFERENCES "laporan_mitra"("laporan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_surat_jalan_item_id_fkey" FOREIGN KEY ("surat_jalan_item_id") REFERENCES "surat_jalan_item"("item_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_transaction" ADD CONSTRAINT "return_transaction_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
