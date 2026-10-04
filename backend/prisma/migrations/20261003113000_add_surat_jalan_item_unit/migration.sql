-- Create surat_jalan_item_unit table (penilaian kondisi per unit inbound).
-- Satu baris = satu unit fisik dari item Surat Jalan (nomor_unit 1..N).
-- Kolom surat_jalan_item.kondisi tidak dihapus, jadi data lama tetap terbaca.
CREATE TABLE "surat_jalan_item_unit" (
  "unit_id" BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY,
  "surat_jalan_item_id" BIGINT NOT NULL,
  "nomor_unit" INTEGER NOT NULL,
  "kondisi" "kondisi_barang" NOT NULL,
  "catatan" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "surat_jalan_item_unit_pkey" PRIMARY KEY ("unit_id")
);

CREATE INDEX "surat_jalan_item_unit_surat_jalan_item_id_idx" ON "surat_jalan_item_unit"("surat_jalan_item_id");

CREATE UNIQUE INDEX "surat_jalan_item_unit_item_nomor_unit_key" ON "surat_jalan_item_unit"("surat_jalan_item_id", "nomor_unit");

ALTER TABLE "surat_jalan_item_unit" ADD CONSTRAINT "surat_jalan_item_unit_surat_jalan_item_id_fkey" FOREIGN KEY ("surat_jalan_item_id") REFERENCES "surat_jalan_item"("item_id") ON DELETE CASCADE ON UPDATE CASCADE;