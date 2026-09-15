-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('info', 'approval', 'warning', 'success', 'error');

-- DropIndex
DROP INDEX "public"."zona_gudang_status_kecukupan_source_idx";

-- CreateTable
CREATE TABLE "notification" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "role" "user_role",
    "type" "notification_type" NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_user_id_is_read_idx" ON "notification"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notification_role_is_read_idx" ON "notification"("role", "is_read");

-- CreateIndex
CREATE INDEX "notification_created_at_idx" ON "notification"("created_at");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
