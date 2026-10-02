-- Add missing columns to zona_gudang
ALTER TABLE zona_gudang ADD COLUMN IF NOT EXISTS dinilai_oleh BigInt;
ALTER TABLE zona_gudang ADD COLUMN IF NOT EXISTS dinilai_pada TIMESTAMP;

-- Drop removed column from zona_gudang
ALTER TABLE zona_gudang DROP COLUMN IF EXISTS utilisasi_persen;

-- Add index and foreign key for dinilai_oleh
CREATE INDEX IF NOT EXISTS idx_zona_gudang_dinilai_oleh ON zona_gudang(dinilai_oleh);
ALTER TABLE zona_gudang ADD CONSTRAINT fk_zona_gudang_dinilai_oleh FOREIGN KEY (dinilai_oleh) REFERENCES user_account(user_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add surat_jalan_url
ALTER TABLE surat_jalan ADD COLUMN IF NOT EXISTS surat_jalan_url TEXT;

-- Drop old tables that were removed
DROP TABLE IF EXISTS rak CASCADE;
DROP TABLE IF EXISTS bin_lokasi CASCADE;

-- Update surat_jalan_item: add zona_id, drop bin_lokasi_id
ALTER TABLE surat_jalan_item ADD COLUMN IF NOT EXISTS zona_id BigInt;
ALTER TABLE surat_jalan_item DROP COLUMN IF EXISTS bin_lokasi_id;
ALTER TABLE surat_jalan_item ADD CONSTRAINT fk_surat_jalan_item_zona_id FOREIGN KEY (zona_id) REFERENCES zona_gudang(zona_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Update stok_gudang: add zona_id, drop bin_lokasi_id
ALTER TABLE stok_gudang ADD COLUMN IF NOT EXISTS zona_id BigInt;
ALTER TABLE stok_gudang DROP COLUMN IF EXISTS bin_lokasi_id;
ALTER TABLE stok_gudang ADD CONSTRAINT fk_stok_gudang_zona_id FOREIGN KEY (zona_id) REFERENCES zona_gudang(zona_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old unique constraint and create new one for stok_gudang
DROP INDEX IF EXISTS stok_gudang_gudang_id_bin_lokasi_id_barang_id_project_id_ko_key;
CREATE UNIQUE INDEX IF NOT EXISTS stok_gudang_gudang_id_zona_id_barang_id_project_id_kondisi_key ON stok_gudang(gudang_id, zona_id, barang_id, project_id, kondisi);
