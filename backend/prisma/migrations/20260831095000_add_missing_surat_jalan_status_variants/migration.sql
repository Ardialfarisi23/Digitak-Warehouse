-- Add missing variants to surat_jalan_status enum
-- This migration ensures all variants defined in schema.prisma exist in the database
DO $$
DECLARE
  variants text[] := ARRAY[
    'sedang_dikirim',
    'menunggu_verifikasi',
    'ready_putaway',
    'ditolak'
  ];
  v text;
BEGIN
  FOREACH v IN ARRAY variants LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = v
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'surat_jalan_status'
      )
    ) THEN
      EXECUTE format('ALTER TYPE surat_jalan_status ADD VALUE %L', v);
    END IF;
  END LOOP;
END $$;
