-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin_general', 'supervisor', 'staf_gudang');

-- CreateEnum
CREATE TYPE "personil_jenis" AS ENUM ('teknisi', 'admin_gudang', 'pengantar_logistik');

-- CreateEnum
CREATE TYPE "gudang_tipe" AS ENUM ('tetap', 'dadakan');

-- CreateEnum
CREATE TYPE "boq_status" AS ENUM ('draft', 'aktif', 'ditolak');

-- CreateEnum
CREATE TYPE "boq_source" AS ENUM ('top_down', 'bottom_up');

-- CreateEnum
CREATE TYPE "external_verification_status" AS ENUM ('terverifikasi', 'menunggu', 'tidak_berlaku');

-- CreateEnum
CREATE TYPE "permintaan_boq_status" AS ENUM ('diajukan', 'ditinjau', 'disetujui', 'ditolak');

-- CreateEnum
CREATE TYPE "surat_jalan_tipe" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "surat_jalan_status" AS ENUM ('draft_diajukan', 'disetujui', 'digenerate', 'diterima_didistribusikan');

-- CreateEnum
CREATE TYPE "kondisi_barang" AS ENUM ('baik', 'rusak_ringan', 'rusak_berat', 'tidak_sesuai_spek', 'doa');

-- CreateEnum
CREATE TYPE "mutasi_jenis" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "approval_entity_type" AS ENUM ('boq', 'surat_jalan');

-- CreateEnum
CREATE TYPE "approval_tahap" AS ENUM ('aktivasi_boq', 'outbound_kritis', 'outbound_di_luar_boq', 'outbound_melebihi_remains');

-- CreateEnum
CREATE TYPE "approval_status" AS ENUM ('menunggu', 'disetujui', 'ditolak');

-- CreateEnum
CREATE TYPE "status_kecukupan_zona" AS ENUM ('CUKUP', 'MENDEKATI_PENUH', 'TIDAK_CUKUP');

-- CreateEnum
CREATE TYPE "audit_aksi" AS ENUM ('create', 'update', 'delete', 'approve');

-- CreateTable
CREATE TABLE "user_account" (
    "user_id" BIGSERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "personil" (
    "personil_id" BIGSERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" "personil_jenis" NOT NULL,
    "no_hp" TEXT,
    "nik" TEXT,
    "email" TEXT,
    "posisi" TEXT,
    "bisa_menyetir" BOOLEAN DEFAULT false,
    "is_material_handler" BOOLEAN DEFAULT false,
    "foto" TEXT,
    "user_id" BIGINT,
    "gudang_id" BIGINT,
    "is_dummy" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT NOT NULL,

    CONSTRAINT "personil_pkey" PRIMARY KEY ("personil_id")
);

-- CreateTable
CREATE TABLE "kendaraan" (
    "kendaraan_id" BIGSERIAL NOT NULL,
    "no_polisi" TEXT NOT NULL,
    "jenis_kendaraan" TEXT NOT NULL,
    "merk" TEXT,
    "kapasitas_angkut" DECIMAL(12,2),
    "keterangan" TEXT,
    "foto" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT NOT NULL,

    CONSTRAINT "kendaraan_pkey" PRIMARY KEY ("kendaraan_id")
);

-- CreateTable
CREATE TABLE "project" (
    "project_id" BIGSERIAL NOT NULL,
    "nama_project" TEXT NOT NULL,
    "title" TEXT,
    "cluster_id" TEXT,
    "area" TEXT,
    "klien" TEXT,
    "kecamatan" TEXT,
    "desa_kelurahan" TEXT,
    "kota_kabupaten" TEXT,
    "provinsi" TEXT,
    "status_aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "gudang" (
    "gudang_id" BIGSERIAL NOT NULL,
    "nama_gudang" TEXT NOT NULL,
    "tipe" "gudang_tipe" NOT NULL,
    "alamat" TEXT,
    "project_id" BIGINT,
    "latitude" TEXT,
    "longitude" TEXT,
    "keterangan" TEXT,
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT NOT NULL,
    "pic_id" BIGINT,

    CONSTRAINT "gudang_pkey" PRIMARY KEY ("gudang_id")
);

-- CreateTable
CREATE TABLE "zona_gudang" (
    "zona_id" BIGSERIAL NOT NULL,
    "gudang_id" BIGINT NOT NULL,
    "kode_zona" TEXT NOT NULL,
    "nama_zona" TEXT,
    "tipe_zona" TEXT,
    "status_kecukupan" "status_kecukupan_zona" DEFAULT 'CUKUP',
    "utilisasi_persen" INTEGER,

    CONSTRAINT "zona_gudang_pkey" PRIMARY KEY ("zona_id")
);

-- CreateTable
CREATE TABLE "zona_utilisasi_log" (
    "log_id" BIGSERIAL NOT NULL,
    "zona_id" BIGINT NOT NULL,
    "status" "status_kecukupan_zona" NOT NULL,
    "diperbarui_oleh" BIGINT NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zona_utilisasi_log_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "rak" (
    "rak_id" BIGSERIAL NOT NULL,
    "zona_id" BIGINT NOT NULL,
    "kode_rak" TEXT NOT NULL,
    "kapasitas_unit" DECIMAL(12,2),

    CONSTRAINT "rak_pkey" PRIMARY KEY ("rak_id")
);

-- CreateTable
CREATE TABLE "bin_lokasi" (
    "bin_id" BIGSERIAL NOT NULL,
    "rak_id" BIGINT NOT NULL,
    "kode_bin" TEXT NOT NULL,
    "kapasitas_unit" DECIMAL(12,2),

    CONSTRAINT "bin_lokasi_pkey" PRIMARY KEY ("bin_id")
);

-- CreateTable
CREATE TABLE "kategori_barang" (
    "kategori_id" BIGSERIAL NOT NULL,
    "nama_kategori" TEXT NOT NULL,
    "is_kritis" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "kategori_barang_pkey" PRIMARY KEY ("kategori_id")
);

-- CreateTable
CREATE TABLE "satuan" (
    "satuan_id" BIGSERIAL NOT NULL,
    "kode_satuan" TEXT NOT NULL,

    CONSTRAINT "satuan_pkey" PRIMARY KEY ("satuan_id")
);

-- CreateTable
CREATE TABLE "barang" (
    "barang_id" BIGSERIAL NOT NULL,
    "kode_perangkat" TEXT NOT NULL,
    "nama_barang" TEXT NOT NULL,
    "kategori_id" BIGINT NOT NULL,
    "satuan_default_id" BIGINT NOT NULL,
    "foto" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT NOT NULL,

    CONSTRAINT "barang_pkey" PRIMARY KEY ("barang_id")
);

-- CreateTable
CREATE TABLE "tiket_material" (
    "tiket_id" BIGSERIAL NOT NULL,
    "kode_tiket" TEXT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "area" TEXT,
    "mos" DECIMAL(14,2),
    "used" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT NOT NULL,

    CONSTRAINT "tiket_material_pkey" PRIMARY KEY ("tiket_id")
);

-- CreateTable
CREATE TABLE "boq" (
    "boq_id" BIGSERIAL NOT NULL,
    "tiket_id" BIGINT NOT NULL,
    "boq_number" TEXT,
    "status" "boq_status" NOT NULL DEFAULT 'draft',
    "source" "boq_source" NOT NULL DEFAULT 'top_down',
    "external_verification_status" "external_verification_status" NOT NULL DEFAULT 'menunggu',
    "tanggal_aktivasi" TIMESTAMP(3),
    "diaktifkan_oleh" BIGINT,
    "catatan" TEXT,
    "reference_file" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT NOT NULL,

    CONSTRAINT "boq_pkey" PRIMARY KEY ("boq_id")
);

-- CreateTable
CREATE TABLE "boq_item" (
    "boq_item_id" BIGSERIAL NOT NULL,
    "boq_id" BIGINT NOT NULL,
    "barang_id" BIGINT NOT NULL,
    "qty_rencana" DECIMAL(14,2) NOT NULL,
    "satuan_id" BIGINT NOT NULL,
    "gudang_tujuan_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boq_item_pkey" PRIMARY KEY ("boq_item_id")
);

-- CreateTable
CREATE TABLE "permintaan_boq" (
    "permintaan_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "tiket_id" BIGINT,
    "barang_id" BIGINT NOT NULL,
    "qty_usulan" DECIMAL(14,2) NOT NULL,
    "alasan" TEXT,
    "status" "permintaan_boq_status" NOT NULL DEFAULT 'diajukan',
    "diajukan_oleh" BIGINT NOT NULL,
    "ditinjau_oleh" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permintaan_boq_pkey" PRIMARY KEY ("permintaan_id")
);

-- CreateTable
CREATE TABLE "surat_jalan" (
    "surat_jalan_id" BIGSERIAL NOT NULL,
    "nomor_surat_jalan" TEXT NOT NULL,
    "tipe" "surat_jalan_tipe" NOT NULL,
    "boq_id" BIGINT,
    "gudang_asal_id" BIGINT,
    "gudang_tujuan_id" BIGINT,
    "kendaraan_id" BIGINT,
    "personil_pengantar_id" BIGINT,
    "status" "surat_jalan_status" NOT NULL DEFAULT 'draft_diajukan',
    "kategori_approval" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggal_disetujui" TIMESTAMP(3),
    "tanggal_digenerate" TIMESTAMP(3),
    "tanggal_diterima" TIMESTAMP(3),
    "project_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" BIGINT NOT NULL,
    "updated_by" BIGINT NOT NULL,

    CONSTRAINT "surat_jalan_pkey" PRIMARY KEY ("surat_jalan_id")
);

-- CreateTable
CREATE TABLE "surat_jalan_item" (
    "item_id" BIGSERIAL NOT NULL,
    "surat_jalan_id" BIGINT NOT NULL,
    "barang_id" BIGINT NOT NULL,
    "qty" DECIMAL(14,2) NOT NULL,
    "satuan_id" BIGINT NOT NULL,
    "kondisi" "kondisi_barang",
    "serial_number" TEXT,
    "foto_url" TEXT,
    "is_kelebihan" BOOLEAN NOT NULL DEFAULT false,
    "catatan" TEXT,
    "bin_lokasi_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surat_jalan_item_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "stok_gudang" (
    "stok_id" BIGSERIAL NOT NULL,
    "gudang_id" BIGINT NOT NULL,
    "bin_lokasi_id" BIGINT,
    "barang_id" BIGINT NOT NULL,
    "project_id" BIGINT,
    "kondisi" "kondisi_barang" NOT NULL DEFAULT 'baik',
    "qty" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stok_gudang_pkey" PRIMARY KEY ("stok_id")
);

-- CreateTable
CREATE TABLE "stok_ledger" (
    "ledger_id" BIGSERIAL NOT NULL,
    "surat_jalan_item_id" BIGINT NOT NULL,
    "barang_id" BIGINT NOT NULL,
    "jenis_mutasi" "mutasi_jenis" NOT NULL,
    "qty" DECIMAL(14,2) NOT NULL,
    "saldo_setelah" DECIMAL(14,2) NOT NULL,
    "waktu_mutasi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stok_ledger_pkey" PRIMARY KEY ("ledger_id")
);

-- CreateTable
CREATE TABLE "approval_log" (
    "approval_id" BIGSERIAL NOT NULL,
    "entity_type" "approval_entity_type" NOT NULL,
    "entity_id" BIGINT NOT NULL,
    "tahap" "approval_tahap" NOT NULL,
    "status" "approval_status" NOT NULL DEFAULT 'menunggu',
    "approver_id" BIGINT,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_log_pkey" PRIMARY KEY ("approval_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "audit_id" BIGSERIAL NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" BIGINT NOT NULL,
    "aksi" "audit_aksi" NOT NULL,
    "actor_id" BIGINT NOT NULL,
    "data_sebelum" JSONB,
    "data_sesudah" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("audit_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_email_key" ON "user_account"("email");

-- CreateIndex
CREATE INDEX "user_account_email_idx" ON "user_account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "personil_nik_key" ON "personil"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "personil_email_key" ON "personil"("email");

-- CreateIndex
CREATE UNIQUE INDEX "personil_user_id_key" ON "personil"("user_id");

-- CreateIndex
CREATE INDEX "personil_user_id_idx" ON "personil"("user_id");

-- CreateIndex
CREATE INDEX "personil_nik_idx" ON "personil"("nik");

-- CreateIndex
CREATE INDEX "personil_gudang_id_idx" ON "personil"("gudang_id");

-- CreateIndex
CREATE UNIQUE INDEX "kendaraan_no_polisi_key" ON "kendaraan"("no_polisi");

-- CreateIndex
CREATE INDEX "kendaraan_no_polisi_idx" ON "kendaraan"("no_polisi");

-- CreateIndex
CREATE INDEX "project_area_idx" ON "project"("area");

-- CreateIndex
CREATE INDEX "gudang_project_id_idx" ON "gudang"("project_id");

-- CreateIndex
CREATE INDEX "gudang_tipe_idx" ON "gudang"("tipe");

-- CreateIndex
CREATE INDEX "zona_gudang_gudang_id_idx" ON "zona_gudang"("gudang_id");

-- CreateIndex
CREATE UNIQUE INDEX "zona_gudang_gudang_id_kode_zona_key" ON "zona_gudang"("gudang_id", "kode_zona");

-- CreateIndex
CREATE INDEX "zona_utilisasi_log_zona_id_idx" ON "zona_utilisasi_log"("zona_id");

-- CreateIndex
CREATE INDEX "zona_utilisasi_log_created_at_idx" ON "zona_utilisasi_log"("created_at");

-- CreateIndex
CREATE INDEX "rak_zona_id_idx" ON "rak"("zona_id");

-- CreateIndex
CREATE UNIQUE INDEX "rak_zona_id_kode_rak_key" ON "rak"("zona_id", "kode_rak");

-- CreateIndex
CREATE INDEX "bin_lokasi_rak_id_idx" ON "bin_lokasi"("rak_id");

-- CreateIndex
CREATE UNIQUE INDEX "bin_lokasi_rak_id_kode_bin_key" ON "bin_lokasi"("rak_id", "kode_bin");

-- CreateIndex
CREATE UNIQUE INDEX "kategori_barang_nama_kategori_key" ON "kategori_barang"("nama_kategori");

-- CreateIndex
CREATE INDEX "kategori_barang_nama_kategori_idx" ON "kategori_barang"("nama_kategori");

-- CreateIndex
CREATE UNIQUE INDEX "satuan_kode_satuan_key" ON "satuan"("kode_satuan");

-- CreateIndex
CREATE UNIQUE INDEX "barang_kode_perangkat_key" ON "barang"("kode_perangkat");

-- CreateIndex
CREATE INDEX "barang_kode_perangkat_idx" ON "barang"("kode_perangkat");

-- CreateIndex
CREATE INDEX "barang_kategori_id_idx" ON "barang"("kategori_id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_material_kode_tiket_key" ON "tiket_material"("kode_tiket");

-- CreateIndex
CREATE INDEX "tiket_material_project_id_idx" ON "tiket_material"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "boq_tiket_id_key" ON "boq"("tiket_id");

-- CreateIndex
CREATE UNIQUE INDEX "boq_boq_number_key" ON "boq"("boq_number");

-- CreateIndex
CREATE INDEX "boq_status_idx" ON "boq"("status");

-- CreateIndex
CREATE INDEX "boq_boq_number_idx" ON "boq"("boq_number");

-- CreateIndex
CREATE INDEX "boq_item_boq_id_idx" ON "boq_item"("boq_id");

-- CreateIndex
CREATE INDEX "boq_item_barang_id_idx" ON "boq_item"("barang_id");

-- CreateIndex
CREATE INDEX "permintaan_boq_project_id_idx" ON "permintaan_boq"("project_id");

-- CreateIndex
CREATE INDEX "permintaan_boq_status_idx" ON "permintaan_boq"("status");

-- CreateIndex
CREATE UNIQUE INDEX "surat_jalan_nomor_surat_jalan_key" ON "surat_jalan"("nomor_surat_jalan");

-- CreateIndex
CREATE INDEX "surat_jalan_status_idx" ON "surat_jalan"("status");

-- CreateIndex
CREATE INDEX "surat_jalan_project_id_idx" ON "surat_jalan"("project_id");

-- CreateIndex
CREATE INDEX "surat_jalan_item_surat_jalan_id_idx" ON "surat_jalan_item"("surat_jalan_id");

-- CreateIndex
CREATE INDEX "stok_gudang_gudang_id_barang_id_idx" ON "stok_gudang"("gudang_id", "barang_id");

-- CreateIndex
CREATE INDEX "stok_gudang_project_id_idx" ON "stok_gudang"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "stok_gudang_gudang_id_bin_lokasi_id_barang_id_project_id_ko_key" ON "stok_gudang"("gudang_id", "bin_lokasi_id", "barang_id", "project_id", "kondisi");

-- CreateIndex
CREATE INDEX "stok_ledger_barang_id_waktu_mutasi_idx" ON "stok_ledger"("barang_id", "waktu_mutasi");

-- CreateIndex
CREATE INDEX "stok_ledger_surat_jalan_item_id_idx" ON "stok_ledger"("surat_jalan_item_id");

-- CreateIndex
CREATE INDEX "approval_log_entity_type_entity_id_idx" ON "approval_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- AddForeignKey
ALTER TABLE "personil" ADD CONSTRAINT "personil_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personil" ADD CONSTRAINT "personil_gudang_id_fkey" FOREIGN KEY ("gudang_id") REFERENCES "gudang"("gudang_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personil" ADD CONSTRAINT "personil_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personil" ADD CONSTRAINT "personil_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kendaraan" ADD CONSTRAINT "kendaraan_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kendaraan" ADD CONSTRAINT "kendaraan_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gudang" ADD CONSTRAINT "gudang_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gudang" ADD CONSTRAINT "gudang_pic_id_fkey" FOREIGN KEY ("pic_id") REFERENCES "personil"("personil_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gudang" ADD CONSTRAINT "gudang_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gudang" ADD CONSTRAINT "gudang_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zona_gudang" ADD CONSTRAINT "zona_gudang_gudang_id_fkey" FOREIGN KEY ("gudang_id") REFERENCES "gudang"("gudang_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zona_utilisasi_log" ADD CONSTRAINT "zona_utilisasi_log_diperbarui_oleh_fkey" FOREIGN KEY ("diperbarui_oleh") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zona_utilisasi_log" ADD CONSTRAINT "zona_utilisasi_log_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona_gudang"("zona_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rak" ADD CONSTRAINT "rak_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona_gudang"("zona_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bin_lokasi" ADD CONSTRAINT "bin_lokasi_rak_id_fkey" FOREIGN KEY ("rak_id") REFERENCES "rak"("rak_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barang" ADD CONSTRAINT "barang_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barang" ADD CONSTRAINT "barang_kategori_id_fkey" FOREIGN KEY ("kategori_id") REFERENCES "kategori_barang"("kategori_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barang" ADD CONSTRAINT "barang_satuan_default_id_fkey" FOREIGN KEY ("satuan_default_id") REFERENCES "satuan"("satuan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barang" ADD CONSTRAINT "barang_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiket_material" ADD CONSTRAINT "tiket_material_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiket_material" ADD CONSTRAINT "tiket_material_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq" ADD CONSTRAINT "boq_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq" ADD CONSTRAINT "boq_diaktifkan_oleh_fkey" FOREIGN KEY ("diaktifkan_oleh") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq" ADD CONSTRAINT "boq_tiket_id_fkey" FOREIGN KEY ("tiket_id") REFERENCES "tiket_material"("tiket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq" ADD CONSTRAINT "boq_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_item" ADD CONSTRAINT "boq_item_barang_id_fkey" FOREIGN KEY ("barang_id") REFERENCES "barang"("barang_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_item" ADD CONSTRAINT "boq_item_boq_id_fkey" FOREIGN KEY ("boq_id") REFERENCES "boq"("boq_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_item" ADD CONSTRAINT "boq_item_gudang_tujuan_id_fkey" FOREIGN KEY ("gudang_tujuan_id") REFERENCES "gudang"("gudang_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_item" ADD CONSTRAINT "boq_item_satuan_id_fkey" FOREIGN KEY ("satuan_id") REFERENCES "satuan"("satuan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_boq" ADD CONSTRAINT "permintaan_boq_barang_id_fkey" FOREIGN KEY ("barang_id") REFERENCES "barang"("barang_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_boq" ADD CONSTRAINT "permintaan_boq_diajukan_oleh_fkey" FOREIGN KEY ("diajukan_oleh") REFERENCES "personil"("personil_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_boq" ADD CONSTRAINT "permintaan_boq_ditinjau_oleh_fkey" FOREIGN KEY ("ditinjau_oleh") REFERENCES "personil"("personil_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_boq" ADD CONSTRAINT "permintaan_boq_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_boq" ADD CONSTRAINT "permintaan_boq_tiket_id_fkey" FOREIGN KEY ("tiket_id") REFERENCES "tiket_material"("tiket_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_boq_id_fkey" FOREIGN KEY ("boq_id") REFERENCES "boq"("boq_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_gudang_asal_id_fkey" FOREIGN KEY ("gudang_asal_id") REFERENCES "gudang"("gudang_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_gudang_tujuan_id_fkey" FOREIGN KEY ("gudang_tujuan_id") REFERENCES "gudang"("gudang_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_kendaraan_id_fkey" FOREIGN KEY ("kendaraan_id") REFERENCES "kendaraan"("kendaraan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_personil_pengantar_id_fkey" FOREIGN KEY ("personil_pengantar_id") REFERENCES "personil"("personil_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan" ADD CONSTRAINT "surat_jalan_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan_item" ADD CONSTRAINT "surat_jalan_item_barang_id_fkey" FOREIGN KEY ("barang_id") REFERENCES "barang"("barang_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan_item" ADD CONSTRAINT "surat_jalan_item_bin_lokasi_id_fkey" FOREIGN KEY ("bin_lokasi_id") REFERENCES "bin_lokasi"("bin_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan_item" ADD CONSTRAINT "surat_jalan_item_satuan_id_fkey" FOREIGN KEY ("satuan_id") REFERENCES "satuan"("satuan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_jalan_item" ADD CONSTRAINT "surat_jalan_item_surat_jalan_id_fkey" FOREIGN KEY ("surat_jalan_id") REFERENCES "surat_jalan"("surat_jalan_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_gudang" ADD CONSTRAINT "stok_gudang_barang_id_fkey" FOREIGN KEY ("barang_id") REFERENCES "barang"("barang_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_gudang" ADD CONSTRAINT "stok_gudang_bin_lokasi_id_fkey" FOREIGN KEY ("bin_lokasi_id") REFERENCES "bin_lokasi"("bin_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_gudang" ADD CONSTRAINT "stok_gudang_gudang_id_fkey" FOREIGN KEY ("gudang_id") REFERENCES "gudang"("gudang_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_gudang" ADD CONSTRAINT "stok_gudang_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_ledger" ADD CONSTRAINT "stok_ledger_barang_id_fkey" FOREIGN KEY ("barang_id") REFERENCES "barang"("barang_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_ledger" ADD CONSTRAINT "stok_ledger_surat_jalan_item_id_fkey" FOREIGN KEY ("surat_jalan_item_id") REFERENCES "surat_jalan_item"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_log" ADD CONSTRAINT "approval_log_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "user_account"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
