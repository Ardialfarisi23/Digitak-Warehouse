-- sync-status-user-personil.sql
-- Idempotent one-time sync: personil.is_aktif <-- user_account.is_aktif
-- Source of truth: user_account.is_aktif (otorisasi login)
-- Jalankan manual sekali setelah review, tidak perlu di-insert ke migration.

UPDATE personil p
SET is_aktif = ua.is_aktif,
    updated_at = NOW()
FROM user_account ua
WHERE p.user_id = ua.user_id
  AND p.is_aktif IS DISTINCT FROM ua.is_aktif;

-- Laporan: personil yang di-sync
SELECT p.personil_id, p.nama, p.is_aktif AS personil_is_aktif, ua.is_aktif AS user_is_aktif
FROM personil p
JOIN user_account ua ON p.user_id = ua.user_id
WHERE p.is_aktif = ua.is_aktif;

-- Laporan: personil tanpa user_account (orphan, status tidak di-sync)
SELECT p.personil_id, p.nama, p.is_aktif
FROM personil p
LEFT JOIN user_account ua ON p.user_id = ua.user_id
WHERE ua.user_id IS NULL;
