-- Placeholder migration to sync with database state
ALTER TABLE zona_gudang ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE surat_jalan ADD COLUMN IF NOT EXISTS catatan_distribusi TEXT;
ALTER TABLE surat_jalan ADD COLUMN IF NOT EXISTS estimasi_tiba TIMESTAMP;
