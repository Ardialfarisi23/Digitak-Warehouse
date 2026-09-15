-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_user_id_category_key" ON "user_notification_preferences"("user_id", "category");

-- CreateIndex
CREATE INDEX "user_notification_preferences_user_id_idx" ON "user_notification_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
