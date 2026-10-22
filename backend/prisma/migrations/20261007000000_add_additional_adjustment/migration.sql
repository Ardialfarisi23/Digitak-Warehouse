-- CreateTable
CREATE TABLE "additional_adjustment" (
    "adjustment_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "barang_id" BIGINT NOT NULL,
    "qty" INTEGER NOT NULL,
    "alasan" TEXT NOT NULL,
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "additional_adjustment_pkey" PRIMARY KEY ("adjustment_id")
);

-- CreateIndex
CREATE INDEX "additional_adjustment_project_id_barang_id_idx" ON "additional_adjustment"("project_id", "barang_id");

-- CreateIndex
CREATE INDEX "additional_adjustment_created_by_idx" ON "additional_adjustment"("created_by");

-- AddForeignKey
ALTER TABLE "additional_adjustment" ADD CONSTRAINT "additional_adjustment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "additional_adjustment" ADD CONSTRAINT "additional_adjustment_barang_id_fkey" FOREIGN KEY ("barang_id") REFERENCES "barang"("barang_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "additional_adjustment" ADD CONSTRAINT "additional_adjustment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
