-- Add 'sedang_dikirim' to surat_jalan_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'sedang_dikirim'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'surat_jalan_status'
    )
  ) THEN
    ALTER TYPE surat_jalan_status ADD VALUE 'sedang_dikirim';
  END IF;
END $$;
