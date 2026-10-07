-- Tambah kolom jenis kendaraan manual untuk outbound.
--
-- Kolom ini nullable supaya kendaraan dari master data (kendaraan_id) tetap
-- menjadi sumber utama. Kolom teks hanya diisi jika outbound menggunakan
-- kendaraan di luar master data.
ALTER TABLE "surat_jalan"
ADD COLUMN "kendaraan_jenis_teks" TEXT;
