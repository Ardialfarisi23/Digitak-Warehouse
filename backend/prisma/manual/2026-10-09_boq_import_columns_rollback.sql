-- Rollback: Remove 3 qty columns from boq_item and restore boq.tiket_id NOT NULL
-- Date: 2026-10-09
-- WARNING: Only run if NO boq rows have tiket_id = NULL (else SET NOT NULL will fail)
-- Run: psql -d digitak_warehouse -f this_file.sql

BEGIN;

-- 1. Drop the 3 new columns from boq_item
ALTER TABLE boq_item
  DROP COLUMN IF EXISTS qty_additional,
  DROP COLUMN IF EXISTS qty_mos,
  DROP COLUMN IF EXISTS qty_used;

-- 2. Restore boq.tiket_id NOT NULL
-- WARNING: This will FAIL if any boq.tiket_id IS NULL
-- Verify first: SELECT count(*) FROM boq WHERE tiket_id IS NULL;
-- Only run if result = 0
ALTER TABLE boq
  ALTER COLUMN tiket_id SET NOT NULL;

COMMIT;