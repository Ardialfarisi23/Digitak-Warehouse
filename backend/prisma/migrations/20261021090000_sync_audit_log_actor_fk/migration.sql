-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_actor_id_fkey";

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;