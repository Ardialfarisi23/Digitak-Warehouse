-- =============================================================================
-- SOFT DELETE USER ACCOUNT & PERSONIL
-- Target:
--   personil_id IN (27, 21, 22)  -> Devan, Gan Gan, Yofi
--   user_id IN (30, 28, 29, 3, 2, 1) -> Devan, Gan Gan, Yofi, Staff Gudang, Supervisor Gudang, Admin General
-- 
-- ROLLBACK / RESTORE:
--   1. Dari backup SQL: psql -d digitak_warehouse -f backups/db_backup_20261010_055658.sql
--   2. Manual restore (jika baru dijalankan):
--      UPDATE user_account SET is_aktif=true WHERE user_id IN (30,28,29,3,2,1);
--      UPDATE personil SET is_aktif=true, user_id=CASE personil_id WHEN 27 THEN 30 WHEN 21 THEN 28 WHEN 22 THEN 29 END WHERE personil_id IN (27,21,22);
--   3. Seed tidak akan recreate karena email masih ada di DB (upsert by email).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SOFT DELETE PERSONIL (harus dulu, sebelum user_account per FK & service logic)
--    Set is_aktif=false dan putus relasi user_id (set NULL)
-- -----------------------------------------------------------------------------
UPDATE personil
SET is_aktif = false,
    user_id = NULL,
    updated_at = now()
WHERE personil_id IN (27, 21, 22);

-- -----------------------------------------------------------------------------
-- 2. SOFT DELETE USER_ACCOUNT
--    Set is_aktif=false
-- -----------------------------------------------------------------------------
UPDATE user_account
SET is_aktif = false,
    updated_at = now()
WHERE user_id IN (30, 28, 29, 3, 2, 1);

-- -----------------------------------------------------------------------------
-- 3. BERSIHKAN user_gudang (CASCADE tapi manual cleanup biar bersih)
-- -----------------------------------------------------------------------------
DELETE FROM user_gudang
WHERE user_id IN (30, 28, 29, 3, 2, 1);

-- -----------------------------------------------------------------------------
-- 4. BERSIHKAN user_notification_preferences (CASCADE tapi manual cleanup)
-- -----------------------------------------------------------------------------
DELETE FROM user_notification_preferences
WHERE user_id IN (30, 28, 29, 3, 2, 1);

COMMIT;

-- -----------------------------------------------------------------------------
-- VERIFIKASI PASCA EKSEKUSI
-- -----------------------------------------------------------------------------
SELECT '=== VERIFIKASI user_account (seharusnya is_aktif=false) ===' AS info;
SELECT user_id, nama, email, role, is_aktif, updated_at
FROM user_account
WHERE user_id IN (30, 28, 29, 3, 2, 1)
ORDER BY user_id;

SELECT '=== VERIFIKASI personil (seharusnya is_aktif=false, user_id=NULL) ===' AS info;
SELECT personil_id, nama, email, posisi, user_id, is_aktif, updated_at
FROM personil
WHERE personil_id IN (27, 21, 22)
ORDER BY personil_id;

SELECT '=== VERIFIKASI user_gudang (seharusnya kosong) ===' AS info;
SELECT * FROM user_gudang WHERE user_id IN (30, 28, 29, 3, 2, 1);

SELECT '=== VERIFIKASI user_notification_preferences (seharusnya kosong) ===' AS info;
SELECT * FROM user_notification_preferences WHERE user_id IN (30, 28, 29, 3, 2, 1);

-- Cek admin tersisa
SELECT '=== ADMIN TERSISA (harus ada Ardi Alfarisi user_id=4) ===' AS info;
SELECT user_id, nama, email, role, is_aktif
FROM user_account
WHERE role = 'admin_general' AND is_aktif = true;

SELECT '=== SUPERVISOR TERSISA (harus ada 6: Budi, Rina, Dedi, Renal, Putri, Nanda) ===' AS info;
SELECT user_id, nama, email, role, is_aktif
FROM user_account
WHERE role = 'supervisor' AND is_aktif = true;