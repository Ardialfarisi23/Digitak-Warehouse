-- Free text kendaraan & driver untuk surat jalan inbound.
--
-- Rationale: inbound bisa berasal dari kendaraan/supir eksternal (vendor) yang tidak
-- terdaftar di master data. Kolom lama `kendaraan_id` dan `personil_pengantar_id`
-- (relasi FK ke master data) TIDAK dihapus — outbound tetap memakainya, dan kolom baru
-- ini nullable supaya reader bisa fallback ke relasi lama ketika kosong.
ALTER TABLE "surat_jalan"
ADD COLUMN     "kendaraan_nama_teks" TEXT,
ADD COLUMN     "kendaraan_no_polisi_teks" TEXT,
ADD COLUMN     "driver_nama_teks" TEXT;
