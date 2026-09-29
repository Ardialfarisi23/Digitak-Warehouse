-- cleanup-test-data.sql
-- Hapus data TEST- dari database.
-- DEFAULT ROLLBACK: ubah ROLLBACK menjadi COMMIT setelah review manual.
--
-- Urutan aman (FK-aware):
--   1. surat_jalan_item_pick (referensi surat_jalan_item)
--   2. stok_ledger (referensi surat_jalan_item)
--   3. audit_log (referensi surat_jalan)
--   4. surat_jalan_item (referensi surat_jalan)
--   5. surat_jalan
--
-- Setiap blok menyertakan SELECT count sebelum dan sesudah.

BEGIN;

-- ============================================
-- 1. surat_jalan_item_pick
-- ============================================
SELECT count(*) AS pick_count_before FROM surat_jalan_item_pick
WHERE surat_jalan_item_id IN (
  SELECT item_id FROM surat_jalan_item WHERE surat_jalan_id IN (
    SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
  )
);

DELETE FROM surat_jalan_item_pick
WHERE surat_jalan_item_id IN (
  SELECT item_id FROM surat_jalan_item WHERE surat_jalan_id IN (
    SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
  )
);

SELECT count(*) AS pick_count_after FROM surat_jalan_item_pick
WHERE surat_jalan_item_id IN (
  SELECT item_id FROM surat_jalan_item WHERE surat_jalan_id IN (
    SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
  )
);

-- ============================================
-- 2. stok_ledger
-- ============================================
SELECT count(*) AS ledger_count_before FROM stok_ledger
WHERE surat_jalan_item_id IN (
  SELECT item_id FROM surat_jalan_item WHERE surat_jalan_id IN (
    SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
  )
);

DELETE FROM stok_ledger
WHERE surat_jalan_item_id IN (
  SELECT item_id FROM surat_jalan_item WHERE surat_jalan_id IN (
    SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
  )
);

SELECT count(*) AS ledger_count_after FROM stok_ledger
WHERE surat_jalan_item_id IN (
  SELECT item_id FROM surat_jalan_item WHERE surat_jalan_id IN (
    SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
  )
);

-- ============================================
-- 3. audit_log
-- ============================================
SELECT count(*) AS audit_count_before FROM audit_log
WHERE entity_type = 'surat_jalan'
  AND entity_id IN (
    SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
  );

DELETE FROM audit_log
WHERE entity_type = 'surat_jalan'
  AND entity_id IN (
    SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
  );

SELECT count(*) AS audit_count_after FROM audit_log
WHERE entity_type = 'surat_jalan'
  AND entity_id IN (
    SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
  );

-- ============================================
-- 4. surat_jalan_item
-- ============================================
SELECT count(*) AS item_count_before FROM surat_jalan_item
WHERE surat_jalan_id IN (
  SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
);

DELETE FROM surat_jalan_item
WHERE surat_jalan_id IN (
  SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
);

SELECT count(*) AS item_count_after FROM surat_jalan_item
WHERE surat_jalan_id IN (
  SELECT surat_jalan_id FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%'
);

-- ============================================
-- 5. surat_jalan
-- ============================================
SELECT count(*) AS sj_count_before FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%';

DELETE FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%';

SELECT count(*) AS sj_count_after FROM surat_jalan WHERE nomor_surat_jalan LIKE 'TEST-%';

-- ============================================
-- 6. Pembalikan stok (TODO - PERLU REVIEW MANUAL)
-- ============================================
-- Stok yang disentuh seed:
--   gudang=2, barang=35, zona=7, kondisi=baik, project=1: current=90, deducted=40 (dari pick qty)
--   gudang=2, barang=6, zona=7, kondisi=baik, project=1: current=90, deducted=20 (dari pick qty)
--   gudang=2, barang=6, zona=7, kondisi=rusak_ringan, project=1: current=90, deducted=10 (dari pick qty)
--
-- TIDAK ADA pembalikan stok otomatis di sini karena:
-- 1. Snapshot .seed-snapshot.json tidak ada (dihapus setelah Step 5c).
-- 2. Stok_ledger TEST- bisa dihapus, tapi stok_ledger NON-TEST juga ada untuk kombinasi yang sama.
-- 3. Tidak ada jaminan bahwa angka 90 adalah hasil pengurangan dari 100 oleh seed saja.
--
-- Jika Anda yakin stok harus dikembalikan ke 100, jalankan manual:
--   UPDATE stok_gudang SET qty = 100 WHERE (gudang_id, barang_id, zona_id, kondisi, project_id) IN
--   ((2, 35, 7, 'baik', 1), (2, 6, 7, 'baik', 1), (2, 6, 7, 'rusak_ringan', 1));
--
-- Verifikasi dengan SELECT sebelum dan sesudah.

ROLLBACK;
