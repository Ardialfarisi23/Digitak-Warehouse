-- Drop existing NOT NULL constraint and FK
ALTER TABLE "stok_ledger" DROP CONSTRAINT IF EXISTS "stok_ledger_surat_jalan_item_id_not_null";
ALTER TABLE "stok_ledger" DROP CONSTRAINT IF EXISTS "stok_ledger_surat_jalan_item_id_fkey";

-- Alter column to nullable
ALTER TABLE "stok_ledger" ALTER COLUMN "surat_jalan_item_id" DROP NOT NULL;

-- Recreate FK with nullable column
ALTER TABLE "stok_ledger" ADD CONSTRAINT "stok_ledger_surat_jalan_item_id_fkey" FOREIGN KEY ("surat_jalan_item_id") REFERENCES "surat_jalan_item"("item_id") ON UPDATE CASCADE ON DELETE RESTRICT;
