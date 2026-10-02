-- Add enum value 'tiba_menunggu_konfirmasi' to surat_jalan_status if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'tiba_menunggu_konfirmasi'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'surat_jalan_status'
    )
  ) THEN
    ALTER TYPE surat_jalan_status ADD VALUE 'tiba_menunggu_konfirmasi';
  END IF;
END $$;

-- AlterTable surat_jalan
ALTER TABLE "surat_jalan" ADD COLUMN     "dilaporkan_tiba_oleh" BigInt;
ALTER TABLE "surat_jalan" ADD COLUMN     "dilaporkan_tiba_at"   Timestamp;
ALTER TABLE "surat_jalan" ADD COLUMN     "catatan_tiba"         Text;
ALTER TABLE "surat_jalan" ADD COLUMN     "dikonfirmasi_oleh"    BigInt;
ALTER TABLE "surat_jalan" ADD COLUMN     "dikonfirmasi_at"      Timestamp;
ALTER TABLE "surat_jalan" ADD COLUMN     "bukti_tiba_url"       Text;

-- AddForeignKey surat_jalan -> user_account (dilaporkan_tiba_oleh)
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_dilaporkan_tiba_oleh_fkey" FOREIGN KEY ("dilaporkan_tiba_oleh") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey surat_jalan -> user_account (dikonfirmasi_oleh)
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_dikonfirmasi_oleh_fkey" FOREIGN KEY ("dikonfirmasi_oleh") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable surat_jalan_item
ALTER TABLE "surat_jalan_item" ADD COLUMN     "qty_diterima"       Decimal(14, 2);
ALTER TABLE "surat_jalan_item" ADD COLUMN     "kondisi_diterima"   Text;
ALTER TABLE "surat_jalan_item" ADD COLUMN     "catatan_penerimaan" Text;
