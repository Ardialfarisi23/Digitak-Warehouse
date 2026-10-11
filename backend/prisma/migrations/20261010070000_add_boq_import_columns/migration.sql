-- Migration: kolom saldo import pada boq_item + kelonggaran boq.tiket_id
-- Sumber: schema.prisma (model boq_item: qty_additional, qty_mos, qty_used;
--         model boq: tiket_id BigInt?) yang belum punya migration — schema drift
--         yang membuat API reconciliation gagal menyebut kolom tidak ada.
-- Pola idempoten (aman bila sebagian kondisi sudah diterapkan sebelumnya).

-- AddColumn boq_item.qty_additional
ALTER TABLE "boq_item" ADD COLUMN IF NOT EXISTS "qty_additional" DECIMAL(14,2);

-- AddColumn boq_item.qty_mos
ALTER TABLE "boq_item" ADD COLUMN IF NOT EXISTS "qty_mos" DECIMAL(14,2);

-- AddColumn boq_item.qty_used
ALTER TABLE "boq_item" ADD COLUMN IF NOT EXISTS "qty_used" DECIMAL(14,2);

-- AlterColumn boq.tiket_id DROP NOT NULL
-- DROP NOT NULL adalah no-op bila kolom sudah nullable, jadi tidak perlu blok DO $$.
ALTER TABLE "boq" ALTER COLUMN "tiket_id" DROP NOT NULL;
