-- Create surat_jalan_item_pick table
CREATE TABLE "surat_jalan_item_pick" (
  "pick_id" BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY,
  "surat_jalan_item_id" BIGINT NOT NULL,
  "gudang_id" BIGINT NOT NULL,
  "zona_id" BIGINT,
  "kondisi_diminta" "kondisi_barang" NOT NULL DEFAULT 'baik',
  "kondisi_diambil" "kondisi_barang" NOT NULL DEFAULT 'baik',
  "qty" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "is_override" BOOLEAN NOT NULL DEFAULT false,
  "catatan_override" TEXT,
  "picked_by" BIGINT,
  "picked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "surat_jalan_item_pick_pick_id_pkey" PRIMARY KEY ("pick_id")
);

CREATE INDEX "surat_jalan_item_pick_surat_jalan_item_id_idx" ON "surat_jalan_item_pick"("surat_jalan_item_id");
