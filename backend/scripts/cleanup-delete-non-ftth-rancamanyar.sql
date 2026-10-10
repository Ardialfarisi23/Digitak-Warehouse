-- =====================================================================
-- Cleanup Script: Hapus semua data project kecuali "FTTH OPEN AREA RANCAMANYAR"
-- Project yang dipertahankan: project_id = 17
-- Clusters yang dipertahankan: semua cluster dengan project_id = 17
-- Clusters & projects yang dihapus: project_id IN (1-11)
-- =====================================================================
BEGIN;

-- Nonaktifkan foreign key checks untuk menghindari error constraint
SET session_replication_role = 'replica';

-- Simpan ID yang akan dihapus ke temp tables
CREATE TEMP TABLE del_project_ids AS
  SELECT project_id FROM project WHERE project_id IN (1,2,3,4,5,6,7,8,9,10,11);

CREATE TEMP TABLE del_cluster_ids AS
  SELECT cluster_id FROM cluster WHERE project_id IN (SELECT project_id FROM del_project_ids);

CREATE TEMP TABLE del_gudang_ids AS
  SELECT gudang_id FROM gudang WHERE project_id IN (SELECT project_id FROM del_project_ids);

CREATE TEMP TABLE del_titik_lapangan_ids AS
  SELECT titik_lapangan_id FROM titik_lapangan
  WHERE project_id IN (SELECT project_id FROM del_project_ids);

CREATE TEMP TABLE del_boq_ids AS
  SELECT boq_id FROM boq WHERE cluster_id IN (SELECT cluster_id FROM del_cluster_ids);

CREATE TEMP TABLE del_surat_jalan_ids AS
  SELECT surat_jalan_id FROM surat_jalan
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids)
     OR boq_id IN (SELECT boq_id FROM del_boq_ids);

CREATE TEMP TABLE del_surat_jalan_item_ids AS
  SELECT item_id FROM surat_jalan_item
  WHERE surat_jalan_id IN (SELECT surat_jalan_id FROM del_surat_jalan_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids);

CREATE TEMP TABLE del_tiket_ids AS
  SELECT tiket_id FROM tiket_material
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids);

CREATE TEMP TABLE del_laporan_mitra_ids AS
  SELECT laporan_id FROM laporan_mitra
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids)
     OR tiket_id IN (SELECT tiket_id FROM del_tiket_ids);

CREATE TEMP TABLE del_return_ids AS
  SELECT return_id FROM return_transaction
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids)
     OR tiket_id IN (SELECT tiket_id FROM del_tiket_ids)
     OR baseline_laporan_id IN (SELECT laporan_id FROM del_laporan_mitra_ids)
     OR surat_jalan_item_id IN (SELECT item_id FROM del_surat_jalan_item_ids);

CREATE TEMP TABLE del_kendaraan_ids AS
  SELECT k.kendaraan_id FROM kendaraan k
  WHERE k.gudang_id IN (SELECT gudang_id FROM del_gudang_ids)
     OR (
       k.kendaraan_id IN (
         SELECT DISTINCT kendaraan_id FROM surat_jalan
         WHERE project_id IN (SELECT project_id FROM del_project_ids)
            OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids)
            OR boq_id IN (SELECT boq_id FROM del_boq_ids)
       )
       AND k.kendaraan_id NOT IN (
         SELECT DISTINCT kendaraan_id FROM surat_jalan
         WHERE project_id IS NOT NULL
            AND project_id NOT IN (SELECT project_id FROM del_project_ids)
            AND (cluster_id IS NULL OR cluster_id NOT IN (SELECT cluster_id FROM del_cluster_ids))
            AND (boq_id IS NULL OR boq_id NOT IN (SELECT boq_id FROM del_boq_ids))
       )
     );

CREATE TEMP TABLE del_additional_adjustment_ids AS
  SELECT adjustment_id FROM additional_adjustment
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids);

CREATE TEMP TABLE del_stok_gudang_ids AS
  SELECT stok_id FROM stok_gudang
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR gudang_id IN (SELECT gudang_id FROM del_gudang_ids);

CREATE TEMP TABLE del_zona_ids AS
  SELECT zona_id FROM zona_gudang zg
  JOIN gudang g ON zg.gudang_id = g.gudang_id
  WHERE g.project_id IN (SELECT project_id FROM del_project_ids);

CREATE TEMP TABLE del_approval_boq_ids AS
  SELECT approval_id FROM approval_log WHERE entity_type = 'boq' AND entity_id IN (SELECT boq_id FROM del_boq_ids);

CREATE TEMP TABLE del_approval_sj_ids AS
  SELECT approval_id FROM approval_log WHERE entity_type = 'surat_jalan' AND entity_id IN (SELECT surat_jalan_id FROM del_surat_jalan_ids);

CREATE TEMP TABLE del_approval_return_ids AS
  SELECT approval_id FROM approval_log WHERE entity_type = 'return_transaction' AND entity_id IN (SELECT return_id FROM del_return_ids);

-- Hapus data dari tabel leaf (tidak ada FK masuk dari tabel lain)
DELETE FROM surat_jalan_item_foto
  WHERE item_id IN (SELECT item_id FROM del_surat_jalan_item_ids);

DELETE FROM surat_jalan_item_pick
  WHERE surat_jalan_item_id IN (SELECT item_id FROM del_surat_jalan_item_ids);

DELETE FROM surat_jalan_item_unit
  WHERE surat_jalan_item_id IN (SELECT item_id FROM del_surat_jalan_item_ids);

-- stok_ledger (referensi ke surat_jalan_item, return_transaction, cluster)
DELETE FROM stok_ledger
  WHERE surat_jalan_item_id IN (SELECT item_id FROM del_surat_jalan_item_ids)
     OR return_transaction_id IN (SELECT return_id FROM del_return_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids);

-- surat_jalan_transit (referensi ke surat_jalan)
DELETE FROM surat_jalan_transit
  WHERE surat_jalan_id IN (SELECT surat_jalan_id FROM del_surat_jalan_ids);

-- surat_jalan_item (referensi ke surat_jalan, cluster)
DELETE FROM surat_jalan_item
  WHERE surat_jalan_id IN (SELECT surat_jalan_id FROM del_surat_jalan_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids);

-- boq_item (referensi ke boq, cluster)
DELETE FROM boq_item
  WHERE boq_id IN (SELECT boq_id FROM del_boq_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids);

-- surat_jalan (referensi ke boq, gudang, cluster, kendaraan, project, titik_lapangan)
DELETE FROM surat_jalan
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids)
     OR boq_id IN (SELECT boq_id FROM del_boq_ids);

-- boq (referensi ke tiket_material, cluster)
DELETE FROM boq
  WHERE cluster_id IN (SELECT cluster_id FROM del_cluster_ids)
     OR tiket_id IN (SELECT tiket_id FROM del_tiket_ids);

-- tiket_material (referensi ke project, cluster)
DELETE FROM tiket_material
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids);

-- laporan_mitra (referensi ke tiket, project, cluster)
DELETE FROM laporan_mitra
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids)
     OR tiket_id IN (SELECT tiket_id FROM del_tiket_ids);

-- return_transaction (referensi ke tiket, project, laporan, surat_jalan_item, cluster)
DELETE FROM return_transaction
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids)
     OR tiket_id IN (SELECT tiket_id FROM del_tiket_ids)
     OR baseline_laporan_id IN (SELECT laporan_id FROM del_laporan_mitra_ids)
     OR surat_jalan_item_id IN (SELECT item_id FROM del_surat_jalan_item_ids);

-- permintaan_boq (referensi ke project, tiket, cluster)
DELETE FROM permintaan_boq
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids)
     OR tiket_id IN (SELECT tiket_id FROM del_tiket_ids);

-- additional_adjustment (referensi ke project, cluster)
DELETE FROM additional_adjustment
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids);

-- reconciliation_remains_note (referensi ke project, cluster)
DELETE FROM reconciliation_remains_note
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR cluster_id IN (SELECT cluster_id FROM del_cluster_ids);

-- stok_gudang (referensi ke gudang, project)
DELETE FROM stok_gudang
  WHERE project_id IN (SELECT project_id FROM del_project_ids)
     OR gudang_id IN (SELECT gudang_id FROM del_gudang_ids);

-- zona_utilisasi_log (referensi ke zona_gudang -> gudang)
DELETE FROM zona_utilisasi_log
  WHERE zona_id IN (
    SELECT zg.zona_id FROM zona_gudang zg
    JOIN gudang g ON zg.gudang_id = g.gudang_id
    WHERE g.project_id IN (SELECT project_id FROM del_project_ids)
  );

-- zona_gudang (referensi ke gudang)
DELETE FROM zona_gudang
  WHERE gudang_id IN (SELECT gudang_id FROM del_gudang_ids);

-- titik_lapangan (referensi ke project)
DELETE FROM titik_lapangan
  WHERE project_id IN (SELECT project_id FROM del_project_ids);

-- user_gudang (referensi ke gudang)
DELETE FROM user_gudang
  WHERE gudang_id IN (SELECT gudang_id FROM del_gudang_ids);

-- kendaraan (hanya yang terkait gudang dari project yang dihapus)
DELETE FROM kendaraan
  WHERE gudang_id IN (SELECT gudang_id FROM del_gudang_ids)
     OR kendaraan_id IN (SELECT kendaraan_id FROM del_kendaraan_ids);

-- gudang (referensi ke project)
DELETE FROM gudang
  WHERE project_id IN (SELECT project_id FROM del_project_ids);

-- cluster (referensi ke project)
DELETE FROM cluster
  WHERE project_id IN (SELECT project_id FROM del_project_ids);

-- project (root table)
DELETE FROM project
  WHERE project_id IN (SELECT project_id FROM del_project_ids);

-- Hapus audit_log yang relevan
DELETE FROM audit_log
  WHERE (entity_type = 'project' AND entity_id IN (SELECT project_id FROM del_project_ids))
     OR (entity_type = 'boq' AND entity_id IN (SELECT boq_id FROM del_boq_ids))
     OR (entity_type = 'surat_jalan' AND entity_id IN (SELECT surat_jalan_id FROM del_surat_jalan_ids))
     OR (entity_type = 'return_transaction' AND entity_id IN (SELECT return_id FROM del_return_ids))
     OR (entity_type = 'additional_adjustment' AND entity_id IN (SELECT adjustment_id FROM del_additional_adjustment_ids));

-- Hapus approval_log yang relevan
DELETE FROM approval_log WHERE approval_id IN (
  SELECT approval_id FROM del_approval_boq_ids
  UNION SELECT approval_id FROM del_approval_sj_ids
  UNION SELECT approval_id FROM del_approval_return_ids
);

-- Hapus temp tables
DROP TABLE IF EXISTS del_project_ids;
DROP TABLE IF EXISTS del_cluster_ids;
DROP TABLE IF EXISTS del_gudang_ids;
DROP TABLE IF EXISTS del_titik_lapangan_ids;
DROP TABLE IF EXISTS del_boq_ids;
DROP TABLE IF EXISTS del_surat_jalan_ids;
DROP TABLE IF EXISTS del_surat_jalan_item_ids;
DROP TABLE IF EXISTS del_tiket_ids;
DROP TABLE IF EXISTS del_laporan_mitra_ids;
DROP TABLE IF EXISTS del_return_ids;
DROP TABLE IF EXISTS del_kendaraan_ids;
DROP TABLE IF EXISTS del_additional_adjustment_ids;
DROP TABLE IF EXISTS del_stok_gudang_ids;
DROP TABLE IF EXISTS del_zona_ids;
DROP TABLE IF EXISTS del_approval_boq_ids;
DROP TABLE IF EXISTS del_approval_sj_ids;
DROP TABLE IF EXISTS del_approval_return_ids;

-- Aktifkan kembali foreign key checks
SET session_replication_role = 'origin';

COMMIT;
