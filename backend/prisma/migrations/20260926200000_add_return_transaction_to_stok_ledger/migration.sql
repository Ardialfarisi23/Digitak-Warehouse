-- AlterTable
ALTER TABLE "stok_ledger" ADD COLUMN "return_transaction_id" BIGINT NULL;

-- AddForeignKey
ALTER TABLE "stok_ledger" ADD CONSTRAINT "stok_ledger_return_transaction_id_fkey" FOREIGN KEY ("return_transaction_id") REFERENCES "return_transaction"("return_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "stok_ledger_return_transaction_id_idx" ON "stok_ledger"("return_transaction_id");
