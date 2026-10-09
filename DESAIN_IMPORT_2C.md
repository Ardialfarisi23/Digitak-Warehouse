# DESAIN IMPORT STEP 2C — CEK TERSISA + DESAIN SCRIPT IMPORT

**Berdasarkan:** `DESAIN_IMPORT_2A.md`, `DESAIN_IMPORT_2B.md`, DB schema, Excel cek  
**Mode:** READ-ONLY

---

## 1. VERIFIKASI `boq.tiket_id` NULLABILITY

**schema.prisma & DB**: `tiket_id BigInt @unique` / `is_nullable='NO'` → **NOT NULL**.  
BOQ tidak bisa dibuat tanpa `tiket_id`.

**Dampak 13 tiket per cluster**: terpengaruh `tiket_material`, `reconciliation`, `laporan_mitra`, `return_transaction`, dashboard, notifikasi. Data palsu `mos=0, used=0` tercampur asli.

**Alternatif minim polusi**: **1 tiket anchor per project** (kode_tiket="IMPORT-2026-RANCAMANYAR") → 1 tiket, 13 BOQ merujuk tiket sama (unik karena `cluster_id` beda).

**Usulan**: **1 tiket anchor per project**. Konfirmasi (R1).

---

## 2. CLUSTER FIELD WAJIB & NULLABILITY (DB)

| Field | Null | Default | Sumber | Catatan |
|-------|------|---------|--------|---------|
| `cluster_id` | NO | — | Excel Row 2 | PK |
| `project_id` | NO | — | FK project baru | — |
| `nama_cluster` | NO | — | Excel Row 3 (normalisasi) | — |
| `status_aktif` | NO | `true` | Default DB | — |
| `created_at`/`updated_at` | NO | `now()` | Auto | — |
| `created_by`/`updated_by` | NO | — | User ID import (Q1) | — |
| `cluster_type` | YES | NULL | Tracker Col K | **0 cocok → NULL** |
| `project_type` | YES | NULL | Tracker Col O | **0 cocok → NULL** |
| `kso_partner/contact` | YES | NULL | Tracker Col P/Q | **0 cocok → NULL** |
| `no_tiket_release` | YES | NULL | Excel Row 5 | ✅ Ada |
| `vendor` | YES | NULL | Tracker Col R | **0 cocok → NULL** |
| `alamat_lengkap` | YES | NULL | Tracker Col H-J | **0 cocok → NULL** |
| `homepass_plan` | YES | NULL | Excel Row 4 | ✅ Ada |
| `pic_id` | YES | NULL | — | NULL (tanpa sumber) |

---

## 3. COCOKAN 13 CLUSTER DENGAN TRACKER

**Hasil**: **0/13 cocok**. Tracker NET-H-000001~000550; BoQ NET-H-004396+ di luar rentang.

**Akibat**: field Tracker (`cluster_type`, `project_type`, `kso_*`, `vendor`, `alamat_lengkap`) → **NULL**. `homepass_plan` & `no_tiket_release` dari Excel. Project kota/kec → default "Kabupaten Bandung"/"Baleendah" (R2).

---

## 4. LIBRARY EXCEL

- `exceljs` ^4.4.0 (dipakai: hidden sheet, formula, merged cells)
- `xlsx` ^0.18.5 (backup)

---

## 5. DESAIN SCRIPT `backend/scripts/import-boq-excel.js`

**Argumen**: `--dry-run` (default), `--execute` (butuh `--user-id`), `--file`, `--user-id`.

**Alur**: baca Excel → normalisasi (cluster_id trim, nama fix typo, blank→NULL) → validasi (49 material, user_id, unik) → bandingkan DB → **dry-run report** ke `output/import-report.md` (ringkasan create/skip/konflik, per cluster totals, warning) → **execute** dalam `$transaction(timeout:120000)`: Project → Tiket anchor (1) → 13 Cluster → 13 BOQ → 637 BOQ Item. Idempotensi: `findUnique` by kunci unik (project.nama, cluster.cluster_id, boq cluster_id+status, boq_item boq_id+barang_id). Ada → skip + log. Audit log: `createAuditLog({entityType, entityId, aksi:"create", actorId, dataSebelum:null, dataSesudah:{...}}, tx)`. Manifest → `output/import-manifest.json` (ids untuk rollback).

---

## 6. VERIFIKASI & ROLLBACK

**Prasyarat `--execute`**: backup `C:\Program Files\PostgreSQL\18\bin\pg_dump.exe -h localhost -U postgres -d digitak_warehouse -Fc -f backup-<ts>.dump`, cek file >0.

**Query verifikasi**: count per tabel, total angka per cluster vs Excel, 0 orphan (boq_item.boq_id, boq.cluster_id, cluster.project_id).

**Rollback (manifest, urutan FK aman)**: 1) boq_item, 2) boq, 3) cluster, 4) tiket_material, 5) project.

---

## 7. PERTANYAAN TERBUKA (≤6)

| # | Pertanyaan | Default |
|---|------------|---------|
| **R1** | `boq.tiket_id` NOT NULL — **1 tiket anchor per project** atau 13 tiket per cluster? | **1 tiket anchor** (minim polusi) |
| **R2** | Project `kota_kabupaten`/`kecamatan` — default "Kab. Bandung"/"Baleendah" atau NULL? | **Default aman**: "Kab. Bandung"/"Baleendah" |
| **R3** | `cluster.project_type` — "Non-KSO" asumsi atau NULL (tidak cocok Tracker)? | **NULL** (jangan tebak) |
| **R4** | Nama project: Excel "FTTH-OPEN-AREA RANCAMANYAR" atau DB existing "FTTH Rancamanyar Tahap 1"? | **Insert baru** pakai nama Excel (D1) |
| **R5** | Timeout transaksi 120 detik cukup? | 120 detik cukup |
| **R6** | Folder `backend/scripts/output/` perlu dibuat dulu? | Ya, script buat otomatis |

---

## KONFIRMASI

✅ Read-only: tidak ubah schema/DB/data/kode. Hanya baca file + SELECT + buat `DESAIN_IMPORT_2C.md`.