-- CreateRefreshTokenTable
CREATE TABLE "public"."refresh_token" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "refresh_token_user_id_idx" ON "public"."refresh_token"("user_id");
CREATE INDEX "refresh_token_expires_at_idx" ON "public"."refresh_token"("expires_at");
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "public"."refresh_token"("token_hash");