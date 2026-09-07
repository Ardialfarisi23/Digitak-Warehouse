-- Migration: capacity_monitoring
-- Tujuan:
--   1. Tambah kolom kapasitas_maksimum (Int, nullable) ke gudang & zona_gudang.
--   2. Tambah kolom status_kecukupan_gudang (enum status_kecukupan_zona, nullable)
--      ke gudang — menyimpan agregasi worst-case level gudang.
--   3. Tambah kolom status_kecukupan_source (enum baru status_kecukupan_source,
--      nullable) ke zona_gudang, dengan BACKFILL derivatif:
--        - row yang sudah pernah dinilai manual (dinilai_oleh IS NOT NULL
--          dan dinilai_pada IS NOT NULL) → 'MANUAL'
--        - row lain                                  → 'AUTO'
--      Backfill ini mengisi kolom BARU dari kolom LAMA yang sudah ada —
--      murni derivasi nilai, bukan mengubah data existing.
--
-- ATURAN KESELAMATAN:
--   - Additive only. Tidak menghapus / mengosongkan / memodifikasi data existing.
--   - Semua kolom baru NULLABLE sehingga row lama tidak wajib di-update manual.
--   - Enum baru dibuat IF NOT EXISTS agar idempotent.

-- ============================================================================
-- 1. Enum baru
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_kecukupan_source') THEN
    CREATE TYPE "status_kecukupan_source" AS ENUM ('AUTO', 'MANUAL');
  END IF;
END$$;

-- ============================================================================
-- 2. Tambah kolom ke gudang
-- ============================================================================

ALTER TABLE "gudang"
  ADD COLUMN IF NOT EXISTS "kapasitas_maksimum"      INTEGER,
  ADD COLUMN IF NOT EXISTS "status_kecukupan_gudang" "status_kecukupan_zona";

-- ============================================================================
-- 3. Tambah kolom ke zona_gudang
-- ============================================================================

ALTER TABLE "zona_gudang"
  ADD COLUMN IF NOT EXISTS "kapasitas_maksimum"      INTEGER,
  ADD COLUMN IF NOT EXISTS "status_kecukupan_source" "status_kecukupan_source";

-- ============================================================================
-- 4. Backfill derivatif: status_kecukupan_source
--    Row yang pernah dinilai manual → MANUAL, selainnya → AUTO.
--    Hanya mengisi kolom BARU. Tidak mengubah kolom existing apapun.
-- ============================================================================

UPDATE "zona_gudang"
SET    "status_kecukupan_source" = CASE
          WHEN "dinilai_oleh" IS NOT NULL AND "dinilai_pada" IS NOT NULL
            THEN 'MANUAL'::"status_kecukupan_source"
          ELSE 'AUTO'::"status_kecukupan_source"
        END
WHERE  "status_kecukupan_source" IS NULL;

-- ============================================================================
-- 5. Index untuk performa query dashboard:
--    - gudang yang punya status non-CUKUP (untuk filter cepat di dashboard)
--    - zona yang punya source = MANUAL (untuk audit)
-- ============================================================================

CREATE INDEX IF NOT EXISTS "gudang_status_kecukupan_gudang_idx"
  ON "gudang" ("status_kecukupan_gudang")
  WHERE "status_kecukupan_gudang" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "zona_gudang_status_kecukupan_source_idx"
  ON "zona_gudang" ("status_kecukupan_source");

-- ============================================================================
-- 6. Constraint ringan (opsional): jika kapasitas_maksimum diisi, harus > 0
--    Ditambahkan sebagai CHECK constraint agar nilai invalid tertolak.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gudang_kapasitas_maksimum_positive_chk'
  ) THEN
    ALTER TABLE "gudang"
      ADD CONSTRAINT "gudang_kapasitas_maksimum_positive_chk"
      CHECK ("kapasitas_maksimum" IS NULL OR "kapasitas_maksimum" > 0);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'zona_gudang_kapasitas_maksimum_positive_chk'
  ) THEN
    ALTER TABLE "zona_gudang"
      ADD CONSTRAINT "zona_gudang_kapasitas_maksimum_positive_chk"
      CHECK ("kapasitas_maksimum" IS NULL OR "kapasitas_maksimum" > 0);
  END IF;
END$$;