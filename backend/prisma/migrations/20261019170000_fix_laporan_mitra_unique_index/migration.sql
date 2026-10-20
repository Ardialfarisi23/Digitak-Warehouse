-- BUG-01: index unique lama hanya memakai (tiket_id, tanggal_laporan, pic_mitra).
-- Kolom barang_id baru ditambahkan setelah index ini dibuat, sehingga laporan mitra
-- multi-item (satu tiket + satu tanggal + satu PIC + beberapa barang) selalu bentrok
-- dan seluruh transaksi upload gagal (current transaction is aborted).
-- Kunci duplikat diperluas dengan barang_id.
DROP INDEX IF EXISTS "laporan_mitra_active_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "laporan_mitra_active_unique"
ON "laporan_mitra" ("tiket_id", "tanggal_laporan", (COALESCE("pic_mitra", '')), (COALESCE("barang_id", 0)))
WHERE "is_aktif" = true;

-- BUG-01: buang sisa field legacy yang tidak dipakai kode mana pun.
ALTER TABLE "tiket_material" DROP COLUMN IF EXISTS "used_terpasang";
