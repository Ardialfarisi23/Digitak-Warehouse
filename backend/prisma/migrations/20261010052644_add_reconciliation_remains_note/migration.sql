-- CreateTable
CREATE TABLE "reconciliation_remains_note" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "cluster_id" TEXT,
    "barang_id" BIGINT NOT NULL,
    "keterangan" TEXT NOT NULL,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_remains_note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reconciliation_remains_note_project_id_barang_id_idx" ON "reconciliation_remains_note"("project_id", "barang_id");
CREATE INDEX "reconciliation_remains_note_cluster_id_barang_id_idx" ON "reconciliation_remains_note"("cluster_id", "barang_id");

-- AddForeignKey
ALTER TABLE "reconciliation_remains_note" ADD CONSTRAINT "reconciliation_remains_note_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reconciliation_remains_note" ADD CONSTRAINT "reconciliation_remains_note_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "cluster"("cluster_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reconciliation_remains_note" ADD CONSTRAINT "reconciliation_remains_note_barang_id_fkey" FOREIGN KEY ("barang_id") REFERENCES "barang"("barang_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reconciliation_remains_note" ADD CONSTRAINT "reconciliation_remains_note_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reconciliation_remains_note" ADD CONSTRAINT "reconciliation_remains_note_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;