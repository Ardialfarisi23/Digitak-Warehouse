-- =============================================================================
-- PREVIEW SOFT DELETE - Hanya SELECT, menghitung dampak sebelum eksekusi
-- Target:
--   personil_id IN (27, 21, 22)  -> Devan, Gan Gan, Yofi
--   user_id IN (30, 28, 29, 3, 2, 1) -> Devan, Gan Gan, Yofi, Staff Gudang, Supervisor Gudang, Admin General
-- =============================================================================

-- 1. Status target sebelum delete
SELECT '=== TARGET user_account ===' AS info;
SELECT user_id, nama, email, role, is_aktif FROM user_account WHERE user_id IN (30, 28, 29, 3, 2, 1) ORDER BY user_id;

SELECT '=== TARGET personil ===' AS info;
SELECT personil_id, nama, email, posisi, jenis, user_id, is_aktif, gudang_id FROM personil WHERE personil_id IN (27, 21, 22) ORDER BY personil_id;

-- 2. user_gudang yang akan dibersihkan
SELECT '=== user_gudang (akan dihapus) ===' AS info;
SELECT ug.id, ug.user_id, ua.nama AS user_nama, ug.gudang_id, g.nama_gudang
FROM user_gudang ug
JOIN user_account ua ON ua.user_id = ug.user_id
JOIN gudang g ON g.gudang_id = ug.gudang_id
WHERE ug.user_id IN (30, 28, 29, 3, 2, 1)
ORDER BY ug.user_id;

-- 3. user_notification_preferences yang akan dibersihkan
SELECT '=== user_notification_preferences (akan dihapus) ===' AS info;
SELECT unp.id, unp.user_id, ua.nama AS user_nama, unp.category, unp.enabled
FROM user_notification_preferences unp
JOIN user_account ua ON ua.user_id = unp.user_id
WHERE unp.user_id IN (30, 28, 29, 3, 2, 1)
ORDER BY unp.user_id;

-- 4. audit_log actor_id (AKAN TETAP ADA - soft delete aman)
SELECT '=== audit_log (actor_id) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah_log
FROM audit_log al
JOIN user_account ua ON ua.user_id = al.actor_id
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

-- 5. notification.user_id
SELECT '=== notification (user_id) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah_notif
FROM notification n
JOIN user_account ua ON ua.user_id = n.user_id
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

-- 6. approval_log.approver_id
SELECT '=== approval_log (approver_id) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah_approval
FROM approval_log al
JOIN user_account ua ON ua.user_id = al.approver_id
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

-- 7. created_by / updated_by di tabel utama (sampel)
SELECT '=== barang (created_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM barang b
JOIN user_account ua ON ua.user_id = b.created_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== barang (updated_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM barang b
JOIN user_account ua ON ua.user_id = b.updated_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== boq (created_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM boq b
JOIN user_account ua ON ua.user_id = b.created_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== boq (updated_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM boq b
JOIN user_account ua ON ua.user_id = b.updated_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== gudang (created_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM gudang g
JOIN user_account ua ON ua.user_id = g.created_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== gudang (updated_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM gudang g
JOIN user_account ua ON ua.user_id = g.updated_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== project (created_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM project p
JOIN user_account ua ON ua.user_id = p.created_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== project (updated_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM project p
JOIN user_account ua ON ua.user_id = p.updated_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== surat_jalan (created_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM surat_jalan sj
JOIN user_account ua ON ua.user_id = sj.created_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== surat_jalan (updated_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM surat_jalan sj
JOIN user_account ua ON ua.user_id = sj.updated_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

-- 8. surat_jalan.dilaporkan_tiba_oleh / dikonfirmasi_oleh
SELECT '=== surat_jalan (dilaporkan_tiba_oleh) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM surat_jalan sj
JOIN user_account ua ON ua.user_id = sj.dilaporkan_tiba_oleh
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== surat_jalan (dikonfirmasi_oleh) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM surat_jalan sj
JOIN user_account ua ON ua.user_id = sj.dikonfirmasi_oleh
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

-- 9. surat_jalan_transit.tiba_by / berangkat_by
SELECT '=== surat_jalan_transit (tiba_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM surat_jalan_transit sjt
JOIN user_account ua ON ua.user_id = sjt.tiba_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== surat_jalan_transit (berangkat_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM surat_jalan_transit sjt
JOIN user_account ua ON ua.user_id = sjt.berangkat_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

-- 10. surat_jalan_item.diperiksa_oleh
SELECT '=== surat_jalan_item (diperiksa_oleh) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM surat_jalan_item sji
JOIN user_account ua ON ua.user_id = sji.diperiksa_oleh
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

-- 11. reconciliation_upload_log.uploaded_by
SELECT '=== reconciliation_upload_log (uploaded_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM reconciliation_upload_log rul
JOIN user_account ua ON ua.user_id = rul.uploaded_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

-- 12. laporan_mitra.uploaded_by
SELECT '=== laporan_mitra (uploaded_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM laporan_mitra lm
JOIN user_account ua ON ua.user_id = lm.uploaded_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

-- 13. return_transaction (created_by, approved_by, received_by)
SELECT '=== return_transaction (created_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM return_transaction rt
JOIN user_account ua ON ua.user_id = rt.created_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== return_transaction (approved_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM return_transaction rt
JOIN user_account ua ON ua.user_id = rt.approved_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

SELECT '=== return_transaction (received_by) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM return_transaction rt
JOIN user_account ua ON ua.user_id = rt.received_by
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

-- 14. zona_utilisasi_log.diperbarui_oleh
SELECT '=== zona_utilisasi_log (diperbarui_oleh) - HITUNGAN ===' AS info;
SELECT ua.user_id, ua.nama, COUNT(*) AS jumlah
FROM zona_utilisasi_log zul
JOIN user_account ua ON ua.user_id = zul.diperbarui_oleh
WHERE ua.user_id IN (30, 28, 29, 3, 2, 1)
GROUP BY ua.user_id, ua.nama
ORDER BY ua.user_id;

-- 15. Personil references (FK RESTRICT - tapi tidak ada dari check-refs)
SELECT '=== gudang (pic_id from personil) ===' AS info;
SELECT g.gudang_id, g.nama_gudang, g.pic_id, p.nama AS personil_nama
FROM gudang g
JOIN personil p ON p.personil_id = g.pic_id
WHERE p.personil_id IN (27, 21, 22);

SELECT '=== cluster (pic_id from personil) ===' AS info;
SELECT c.cluster_id, c.nama_cluster, c.pic_id, p.nama AS personil_nama
FROM cluster c
JOIN personil p ON p.personil_id = c.pic_id
WHERE p.personil_id IN (27, 21, 22);

SELECT '=== permintaan_boq (diajukan_oleh from personil) ===' AS info;
SELECT pb.permintaan_id, pb.status, pb.diajukan_oleh, p.nama AS personil_nama
FROM permintaan_boq pb
JOIN personil p ON p.personil_id = pb.diajukan_oleh
WHERE p.personil_id IN (27, 21, 22);

SELECT '=== permintaan_boq (ditinjau_oleh from personil) ===' AS info;
SELECT pb.permintaan_id, pb.status, pb.ditinjai_oleh, p.nama AS personil_nama
FROM permintaan_boq pb
JOIN personil p ON p.personil_id = pb.ditinjai_oleh
WHERE p.personil_id IN (27, 21, 22);

SELECT '=== surat_jalan (personil_pengantar_id from personil) ===' AS info;
SELECT sj.surat_jalan_id, sj.nomor_surat_jalan, sj.status, sj.personil_pengantar_id, p.nama AS personil_nama
FROM surat_jalan sj
JOIN personil p ON p.personil_id = sj.personil_pengantar_id
WHERE p.personil_id IN (27, 21, 22);