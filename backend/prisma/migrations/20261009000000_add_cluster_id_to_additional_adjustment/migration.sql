-- Add cluster_id column to additional_adjustment table
ALTER TABLE "additional_adjustment" ADD COLUMN "cluster_id" TEXT;

-- Create index on cluster_id, barang_id for cluster-level queries
CREATE INDEX "additional_adjustment_cluster_id_barang_id_idx" ON "additional_adjustment"("cluster_id", "barang_id");

-- Add foreign key constraint to cluster table
ALTER TABLE "additional_adjustment" ADD CONSTRAINT "additional_adjustment_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "cluster"("cluster_id") ON DELETE RESTRICT ON UPDATE CASCADE;