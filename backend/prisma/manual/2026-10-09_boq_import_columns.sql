-- Migration: Add 3 qty columns to boq_item and make boq.tiket_id nullable
-- Date: 2026-10-09
-- Run: psql -d digitak_warehouse -f this_file.sql
-- Rollback: see 2026-10-09_boq_import_columns_rollback.sql

BEGIN;

-- 1. Add qty_additional, qty_mos, qty_used to boq_item (same type as qty_rencana: DECIMAL(14,2))
ALTER TABLE boq_item
  ADD COLUMN qty_additional DECIMAL(14,2) NULL,
  ADD COLUMN qty_mos DECIMAL(14,2) NULL,
  ADD COLUMN qty_used DECIMAL(14,2) NULL;

-- 2. Make boq.tiket_id nullable (keep UNIQUE index and FK)
ALTER TABLE boq
  ALTER COLUMN tiket_id DROP NOT NULL;

COMMIT;

-- Verification queries (run after migration):
-- SELECT column_name, is_nullable, data_type, numeric_precision, numeric_scale
-- FROM information_schema.columns
-- WHERE table_name = 'boq_item' AND column_name IN ('qty_additional', 'qty_mos', 'qty_used')
-- ORDER BY column_name;
--
-- SELECT column_name, is_nullable FROM information_schema.columns
-- WHERE table_name = 'boq' AND column_name = 'tiket_id';
--
-- SELECT indexname FROM pg_indexes WHERE tablename = 'boq' AND indexname = 'boq_tiket_id_key';