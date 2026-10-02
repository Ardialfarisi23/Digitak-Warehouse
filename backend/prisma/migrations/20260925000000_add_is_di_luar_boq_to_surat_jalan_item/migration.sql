
-- Add is_di_luar_boq column to surat_jalan_item table
ALTER TABLE surat_jalan_item ADD COLUMN is_di_luar_boq BOOLEAN NOT NULL DEFAULT false;

