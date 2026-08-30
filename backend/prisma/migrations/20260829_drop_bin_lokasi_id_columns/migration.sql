-- Drop bin_lokasi_id from surat_jalan_item
ALTER TABLE "surat_jalan_item" DROP COLUMN IF EXISTS "bin_lokasi_id";

-- Drop bin_lokasi_id from stok_gudang
ALTER TABLE "stok_gudang" DROP COLUMN IF EXISTS "bin_lokasi_id";
