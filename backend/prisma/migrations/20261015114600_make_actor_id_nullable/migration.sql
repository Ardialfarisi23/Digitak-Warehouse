-- Make actor_id nullable in audit_log table
ALTER TABLE "audit_log" ALTER COLUMN "actor_id" DROP NOT NULL;