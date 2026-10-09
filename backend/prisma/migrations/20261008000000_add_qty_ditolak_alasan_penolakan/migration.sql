-- AlterTable surat_jalan_item: qty ditolak + alasan penolakan penerimaan
ALTER TABLE "surat_jalan_item" ADD COLUMN IF NOT EXISTS "qty_ditolak"      Decimal(14, 2);
ALTER TABLE "surat_jalan_item" ADD COLUMN IF NOT EXISTS "alasan_penolakan" Text;
