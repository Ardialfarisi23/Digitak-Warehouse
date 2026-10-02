-- Create sequence for foto_id FIRST
CREATE SEQUENCE IF NOT EXISTS surat_jalan_item_foto_foto_id_seq;

-- Create surat_jalan_item_foto table
CREATE TABLE IF NOT EXISTS surat_jalan_item_foto (
  foto_id       BigInt   PRIMARY KEY DEFAULT nextval('surat_jalan_item_foto_foto_id_seq'),
  item_id       BigInt   NOT NULL,
  url           TEXT     NOT NULL,
  filename      TEXT,
  mimetype      TEXT,
  ukuran_bytes  BigInt,
  created_at    TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_surat_jalan_item_foto_item FOREIGN KEY (item_id) REFERENCES surat_jalan_item(item_id) ON DELETE CASCADE
);

-- Create index for item_id
CREATE INDEX IF NOT EXISTS idx_surat_jalan_item_foto_item_id ON surat_jalan_item_foto(item_id);

-- Add verification columns to surat_jalan_item
ALTER TABLE surat_jalan_item ADD COLUMN IF NOT EXISTS diperiksa_oleh BigInt;
ALTER TABLE surat_jalan_item ADD COLUMN IF NOT EXISTS diperiksa_pada TIMESTAMP;

-- Add foreign key for diperiksa_oleh (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'surat_jalan_item' AND constraint_name = 'fk_surat_jalan_item_diperiksa_oleh'
  ) THEN
    ALTER TABLE surat_jalan_item ADD CONSTRAINT fk_surat_jalan_item_diperiksa_oleh FOREIGN KEY (diperiksa_oleh) REFERENCES user_account(user_id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add index for diperiksa_oleh
CREATE INDEX IF NOT EXISTS idx_surat_jalan_item_diperiksa_oleh ON surat_jalan_item(diperiksa_oleh);
