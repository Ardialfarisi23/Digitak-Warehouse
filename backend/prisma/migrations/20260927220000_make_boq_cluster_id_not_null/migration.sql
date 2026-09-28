-- Make boq.cluster_id NOT NULL
-- Pre-check: SELECT COUNT(*) FROM boq WHERE cluster_id IS NULL; -- result: 0

ALTER TABLE "boq" ALTER COLUMN "cluster_id" SET NOT NULL;
