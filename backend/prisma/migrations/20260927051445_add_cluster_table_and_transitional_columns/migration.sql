-- Create cluster table
CREATE TABLE "cluster" (
    "cluster_id" TEXT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "nama_cluster" TEXT NOT NULL,
    "cluster_type" TEXT,
    "project_type" TEXT,
    "kso_partner" TEXT,
    "kso_contact" TEXT,
    "no_tiket_release" TEXT,
    "vendor" TEXT,
    "status_aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT NOT NULL,

    CONSTRAINT "cluster_pkey" PRIMARY KEY ("cluster_id")
);

-- Add cluster_id to tiket_material
ALTER TABLE "tiket_material" ADD COLUMN "cluster_id" TEXT;

-- Add cluster_id to boq
ALTER TABLE "boq" ADD COLUMN "cluster_id" TEXT;

-- Indexes
CREATE INDEX "cluster_project_id_idx" ON "cluster"("project_id");
CREATE UNIQUE INDEX "cluster_project_id_nama_cluster_key" ON "cluster"("project_id", "nama_cluster");
CREATE INDEX "boq_cluster_id_idx" ON "boq"("cluster_id");

-- Foreign keys
ALTER TABLE "cluster" ADD CONSTRAINT "cluster_project_id_fkey" 
    FOREIGN KEY ("project_id") REFERENCES "project"("project_id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;
