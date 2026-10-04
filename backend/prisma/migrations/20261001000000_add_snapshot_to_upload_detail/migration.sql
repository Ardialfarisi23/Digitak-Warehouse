ALTER TABLE "reconciliation_upload_detail"
  ADD COLUMN "kondisi" "kondisi_barang",
  ADD COLUMN "nama_barang" TEXT,
  ADD COLUMN "kode_barang" TEXT,
  ADD COLUMN "project_nama" TEXT,
  ADD COLUMN "tanggal_laporan" TIMESTAMP(3),
  ADD COLUMN "pic_mitra" TEXT,
  ADD COLUMN "catatan" TEXT;