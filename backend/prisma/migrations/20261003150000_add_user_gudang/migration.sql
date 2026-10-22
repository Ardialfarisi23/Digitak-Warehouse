-- Tabel penugasan gudang untuk Staf Gudang (relasi banyak-ke-banyak
-- user_account <-> gudang).
--
-- Rationale: aturan bisnis belum settles apakah satu staf hanya boleh punya satu
-- gudang atau boleh banyak, jadi penugasan tidak bisa disimpan di kolom singular.
-- Dengan tabel ini satu staf bisa ditugaskan ke satu atau beberapa gudang tanpa
-- mengubah perilaku kode yang sudah ada.
--
-- Catatan penting: TIDAK ada backfill dari `personil.gudang_id`. Daftar gudang seorang
-- staf dibaca di runtime sebagai UNION baris tabel ini dengan `personil.gudang_id`
-- milik user tersebut, sehingga data lama tetap berlaku dan `personil.gudang_id`
-- tidak diubah maupun dihapus (masih dipakai modul personnel & notifikasi).
CREATE TABLE "user_gudang" (
  "id" BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY,
  "user_id" BIGINT NOT NULL,
  "gudang_id" BIGINT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_gudang_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_gudang_gudang_id_idx" ON "user_gudang"("gudang_id");

CREATE INDEX "user_gudang_user_id_idx" ON "user_gudang"("user_id");

CREATE UNIQUE INDEX "user_gudang_user_id_gudang_id_key" ON "user_gudang"("user_id", "gudang_id");

ALTER TABLE "user_gudang" ADD CONSTRAINT "user_gudang_gudang_id_fkey" FOREIGN KEY ("gudang_id") REFERENCES "gudang"("gudang_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_gudang" ADD CONSTRAINT "user_gudang_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;