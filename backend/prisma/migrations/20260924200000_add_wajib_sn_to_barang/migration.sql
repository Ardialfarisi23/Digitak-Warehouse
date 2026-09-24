-- Add wajib_sn column to barang table
ALTER TABLE "barang" ADD COLUMN "wajib_sn" BOOLEAN NOT NULL DEFAULT false;
