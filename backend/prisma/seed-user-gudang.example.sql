-- =============================================================================
-- CONTOH PENUGASAN GUDANG UNTUK STAF GUDANG  (file contoh, TIDAK dijalankan)
-- =============================================================================
-- File ini hanya dokumentasi + template SQL. File ini SENGAJA TIDAK diletakkan
-- di folder migrations/ supaya tidak ikut dijalankan oleh `prisma migrate deploy`.
-- Jalankan manual lewat psql / DBeaver / Navicat, atau salin query yang dipakai.
--
-- Kapan perlu dipakai:
--   Saat sebuah staf perlu diberi akses ke gudang tambahan, atau saat penugasan
--   lama sudah tidak relevan. Semua penugasan baru cukup dicatat di sini, tanpa
--   menyentuh kode aplikasi.
--
-- CARA KERJA DAFTAR GUDANG STAF:
--   Backend membaca daftar gudang seorang staf sebagai UNION dari dua sumber:
--     1) tabel `user_gudang`            -> penugasan tambahan / multi gudang
--     2) `personil.gudang_id`           -> penugasan lama (tunggal), tidak diubah
--   Jadi staf yang punya `personil.gudang_id` = 3 dan baris `user_gudang` untuk
--   gudang 5 akan terlihat sebagai staf gudang 3 DAN gudang 5.
--
-- ATURAN:
--   - Hanya role `staf_gudang` yang dibatasi. `admin_general` dan `supervisor`
--     selalu tetap punya akses penuh, apa pun isi tabel ini.
--   - Satu pasangan (user_id, gudang_id) hanya boleh muncul satu kali
--     (dijamin unique index user_gudang_user_id_gudang_id_key).
--   - Kalau seorang staf belum punya baris sama sekali di `user_gudang` DAN
--     `personil.gudang_id`-nya kosong, backend akan menolak semua aksesnya
--     dengan 403 "Anda belum ditugaskan ke gudang mana pun. Hubungi supervisor."
-- =============================================================================


-- -----------------------------------------------------------------------------
-- CARA 1 (disarankan): insert dengan SELECT, aman dari duplikat.
-- Ganti nilai EMAIL dan NAMA_GUDANG sesuai data Anda.
-- -----------------------------------------------------------------------------
INSERT INTO "user_gudang" ("user_id", "gudang_id")
SELECT ua."user_id", g."gudang_id"
FROM "user_account" ua
CROSS JOIN "gudang" g
WHERE ua."email" = 'staf.gudang@digitak.co.id'
  AND g."nama_gudang" = 'Gudang Utama Jakarta'
ON CONFLICT ("user_id", "gudang_id") DO NOTHING;

-- Tambahkan satu gudang lagi untuk staf yang sama (multi gudang).
INSERT INTO "user_gudang" ("user_id", "gudang_id")
SELECT ua."user_id", g."gudang_id"
FROM "user_account" ua
CROSS JOIN "gudang" g
WHERE ua."email" = 'staf.gudang@digitak.co.id'
  AND g."nama_gudang" = 'Gudang Cadangan Bekasi'
ON CONFLICT ("user_id", "gudang_id") DO NOTHING;


-- -----------------------------------------------------------------------------
-- CARA 2: kalau sudah tahu angka ID-nya, boleh langsung tulis ID.
-- -----------------------------------------------------------------------------
-- INSERT INTO "user_gudang" ("user_id", "gudang_id") VALUES (7, 3);
-- INSERT INTO "user_gudang" ("user_id", "gudang_id") VALUES (7, 5);


-- -----------------------------------------------------------------------------
-- CARA 3: pakai penugasan lama `personil.gudang_id` sebagai titik awal.
-- Perintah ini menghasilkan satu baris per staf, jadi HINDARI dijalankan ulang
-- untuk staf yang sama — unique index akan menolaknya. Clause ON CONFLICT di
-- bawah membuat perintah ini aman dijalankan berulang kali.
-- -----------------------------------------------------------------------------
-- INSERT INTO "user_gudang" ("user_id", "gudang_id")
-- SELECT p."user_id", p."gudang_id"
-- FROM "personil" p
-- WHERE p."user_id" IS NOT NULL
--   AND p."gudang_id" IS NOT NULL
-- ON CONFLICT ("user_id", "gudang_id") DO NOTHING;


-- -----------------------------------------------------------------------------
-- MEMBATASI SEMUA STAF KE SATU GUDANG (pola massal).
-- HATI-HATI: ini membatalkan penugasan tambahan lain milik staf yang sudah ada.
-- Jalankan per-email, jangan untuk semua orang sekaligus.
-- -----------------------------------------------------------------------------
-- INSERT INTO "user_gudang" ("user_id", "gudang_id")
-- SELECT ua."user_id", 1
-- FROM "user_account" ua
-- WHERE ua."email" = 'staf.gudang@digitak.co.id'
-- ON CONFLICT ("user_id", "gudang_id") DO NOTHING;


-- =============================================================================
-- PEMERIKSAAN HASIL (read-only, aman dijalankan kapan pun)
-- =============================================================================

-- Lihat semua penugasan yang tercatat di tabel baru.
-- SELECT ug."id", ua."email", ua."role", g."nama_gudang", ug."created_at"
-- FROM "user_gudang" ug
-- JOIN "user_account" ua ON ua."user_id" = ug."user_id"
-- JOIN "gudang" g        ON g."gudang_id" = ug."gudang_id"
-- ORDER BY ua."email", g."nama_gudang";

-- Lihat daftar gabungan yang benar-benar dipakai backend: tabel baru + penugasan lama.
-- SELECT ua."email", ua."role",
--        ARRAY_AGG(DISTINCT g."nama_gudang") AS daftar_gudang
-- FROM "user_account" ua
-- LEFT JOIN "user_gudang" ug ON ug."user_id" = ua."user_id"
-- LEFT JOIN "gudang" g        ON g."gudang_id" = ug."gudang_id"
-- LEFT JOIN "personil" p      ON p."user_id" = ua."user_id"
-- LEFT JOIN "gudang" pg       ON pg."gudang_id" = p."gudang_id"
-- WHERE ua."role" = 'staf_gudang'
-- GROUP BY ua."email", ua."role"
-- ORDER BY ua."email";

-- Daftar staf yang sama sekali belum punya penugasan.
-- Backend akan menolak aksesnya sampai ditugaskan.
-- SELECT ua."email", ua."nama"
-- FROM "user_account" ua
-- LEFT JOIN "user_gudang" ug ON ug."user_id" = ua."user_id"
-- LEFT JOIN "personil" p     ON p."user_id" = ua."user_id"
-- WHERE ua."role" = 'staf_gudang'
--   AND ua."is_aktif" = TRUE
--   AND ug."user_id" IS NULL
--   AND p."gudang_id" IS NULL
-- ORDER BY ua."email";


-- =============================================================================
-- MENCABUT PENUGASAN
-- =============================================================================

-- Cabut satu gudang dari satu staf.
-- DELETE FROM "user_gudang" ug
-- USING "user_account" ua, "gudang" g
-- WHERE ug."user_id" = ua."user_id"
--   AND ug."gudang_id" = g."gudang_id"
--   AND ua."email" = 'staf.gudang@digitak.co.id'
--   AND g."nama_gudang" = 'Gudang Cadangan Bekasi';

-- Cabut SEMUA penugasan di tabel baru untuk seorang staf.
-- Perhatian: kalau `personil.gudang_id`-nya juga terisi, staf masih punya akses
-- ke gudang itu lewat jalur penugasan lama.
-- DELETE FROM "user_gudang"
-- WHERE "user_id" = (
--   SELECT "user_id" FROM "user_account" WHERE "email" = 'staf.gudang@digitak.co.id'
-- );