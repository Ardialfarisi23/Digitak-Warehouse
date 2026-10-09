# DESAIN IMPORT STEP 2B — PEMETAAN EXCEL→DB + ATURAN DATA

**Berdasarkan:** `ANALISIS_IMPORT_EXCEL.md`, `DESAIN_IMPORT_2A.md`, `schema.prisma`, kode modul  
**Mode:** READ-ONLY

---

## 1. KONSEP "ADDITIONAL" SAAT INI vs KOLOM BARU

**Existing**: `additional_adjustment` (per project+barang) + `surat_jalan_item.is_kelebihan` (per project+barang).  
**Excel**: per **cluster+barang** (granularitas beda).  
**Rekomendasi**: JANGAN pakai `additional_adjustment`. Tambah `qty_additional` di `boq_item` (nullable, Decimal(14,2)). Sinkronisasi total per project hitung di query/view. Tidak bentrok (scope beda).

---

## 2. FIELD WAJIB (NON-NULL, TANPA DEFAULT)

| Model | Field | Nilai / Sumber | Q |
|-------|-------|----------------|---|
| **project** | `nama_project` | "FTTH-OPEN-AREA RANCAMANYAR" | — |
| | `created_by`, `updated_by` | User ID import | **Q1** |
| | `area` | "Rancamanyar" | — |
| | `kota_kabupaten`/`kecamatan` | "Kab. Bandung"/"Baleendah" | **Q2,Q3** |
| **cluster** | `cluster_id` | NET-H-xxxxx / MF-H-xxxxx (row 2) | — |
| | `project_id` | FK project baru | — |
| | `nama_cluster` | Excel row 3, normalisasi typo | **Q5** |
| | `homepass_plan` | Excel row 4 (Int) | — |
| | `no_tiket_release` | Excel row 5 (URxxxxx) | — |
| **boq** | `tiket_id` | **WAJIB (unique)** | **Q8** |
| | `cluster_id`, `boq_number` (auto), `status`="draft", `source`="top_down" | — | — |
| **boq_item** | `boq_id`, `barang_id` (lookup kode_perangkat), `qty_rencana`=BoQ Plan, `satuan_id`=barang.satuan_default_id | — | — |
| | `qty_additional`=Additional, `qty_mos`=MOS, `qty_used`=Used (nullable, Decimal(14,2)) | — | — |
| | `qty_remains` | **HITUNG**: `qty_mos - COALESCE(qty_additional,0) - qty_rencana` | — |
| | `gudang_tujuan_id` | NULL / gudang default | **Q9** |

---

## 3. BOQ NUMBER & TIKET_ID

`generateBoqNumber()`: `BOQ-${year}-${4-digit}`. **`tiket_id` WAJIB** (unique).  
**Solusi (Opsi A)**: Buat `tiket_material` per cluster dulu pakai `kode_tiket = no_tiket_release (URxxxxx)`, `project_id`=project baru, `cluster_id`=cluster, `mos=used=0`. Lalu buat BOQ referensi tiket tersebut.

---

## 4. PEMETAAN FINAL: EXCEL → DB (25 BARIS)

| # | Excel | Tabel.Field | Transformasi |
|---|-------|-------------|--------------|
| 1 | Rekap BoQ Row 1 Title | `project.nama_project` | Trim |
| 2 | Rekap BoQ Row 1 Title | `project.title` | Sama #1 |
| 3 | Rekap BoQ Row 1 Title | `project.area` | "Rancamanyar" |
| 4 | Rekap BoQ Row 3/cluster | `cluster.nama_cluster` | Normalisasi "Arean→Area", "OPEN→Open" |
| 5 | Rekap BoQ Row 2/cluster | `cluster.cluster_id` | Trim uppercase |
| 6 | Rekap BoQ Row 4/cluster | `cluster.homepass_plan` | ParseInt |
| 7 | Rekap BoQ Row 5/cluster | `cluster.no_tiket_release` | Trim, "-"→null |
| 8 | Rekap BoQ Col J,O,T... (BoQ Plan) | `boq_item.qty_rencana` | Decimal(14,2) |
| 9 | Rekap BoQ Col K,P,U... (Additional) | `boq_item.qty_additional` | Decimal(14,2), blank→NULL |
| 10 | Rekap BoQ Col L,Q,V... (MOS) | `boq_item.qty_mos` | Decimal(14,2), blank→NULL |
| 11 | Rekap BoQ Col M,R,W... (Used) | `boq_item.qty_used` | Decimal(14,2), blank→NULL |
| 12 | Rekap BoQ Col C (Material Code) | `boq_item.barang_id` | Lookup `barang.kode_perangkat` (49/49) |
| 13 | Rekap BoQ Col D (Satuan) | `boq_item.satuan_id` | Dari `barang.satuan_default_id` |
| 14 | Rekap BoQ Col N,S,X... (Remains) | **TIDAK DISIMPAN** | Hitung: `qty_mos - COALESCE(qty_additional,0) - qty_rencana` |
| 15 | Tracker Col H-J | `cluster.alamat_lengkap` | Gabung "Kota, Kec, Kel" |
| 16 | Tracker Col K | `cluster.cluster_type` | "Open Area" |
| 17 | Tracker Col O | `cluster.project_type` | "Non-KSO"/"KSO" |
| 18 | Tracker Col P,Q,R | `cluster.kso_partner`, `kso_contact`, `vendor` | Copy |
| 19 | Tracker Col L | `cluster.homepass_plan` | Sudah dari BoQ |
| 20 | — | `project.created_by` | **Q1** |
| 21 | — | `tiket_material.kode_tiket` | Dari `cluster.no_tiket_release` |
| 22 | — | `tiket_material.project_id` | FK project baru |
| 23 | — | `tiket_material.cluster_id` | FK cluster |
| 24 | — | `boq.tiket_id` | FK tiket_material yg dibuat |
| 25 | — | `boq.cluster_id` | FK cluster |

---

## 5. ATURAN DATA BERMASALAH

| Masalah | Aturan (D1-D7) |
|---------|----------------|
| NET-H-004410 incomplete | Import BoQ Plan saja, kolom lain **NULL**, tandai laporan |
| Sel kosong (blank) | **NULL** (bukan 0) untuk Additional, Used, MOS |
| Nama cluster typo | Normalisasi: "Arean"→"Area", "OPEN"→"Open", baku "FTTH Open Area Rancamanyar RW XX" |
| Project nama beda DB existing | **Insert project BARU** (D1), jangan update ID 1 |
| Angka teks / "-" / ribuan | Parse `Number()`, "-"→null, `""`→null (data sudah bersih) |
| Baris material semua-kosong | **Skip** jika `qty_rencana` NULL DAN `qty_mos` NULL DAN `qty_additional` NULL (**Q10**) |
| Remains negatif | **Diizinkan** (D3), hitung di aplikasi |

---

## 6. CEK READ-ONLY: DB

- Project "FTTH-OPEN-AREA RANCAMANYAR": **BELUM ADA** (ID 1 = "FTTH Rancamanyar Tahap 1")
- 13 Cluster BoQ: **SEMUA BELUM ADA** (0/13)
- NET-H-* existing: 3 cluster lain (Bojongsoang, Baleendah, Pangandaran) — beda project  
**Kesimpulan**: Import 13 cluster BARU + project BARU — no PK conflict.

---

## 7. AUDIT LOG IMPORT

Pola BOQ: `audit_log` entity_type="boq", aksi="create", data_sesudah={boq_number, status, tiket_id, item_count, source:"excel_import"}.  
**Usulan**: 1 log per BOQ (13) + 1 project + 1 per cluster (opsional). Pakai `createAuditLog` util. Actor = user import.

---

## KONFIRMASI

✅ Read-only: tidak ubah schema/DB/data/kode. Hanya baca file + SELECT + buat dokumen.

---

## PERTANYAAN TERBUKA (usulan default)

| # | Pertanyaan | Default |
|---|------------|---------|
| **Q1** | `created_by` user ID import? | CLI arg/env `IMPORT_USER_ID` (default: 1=admin) |
| **Q2** | `project.kota_kabupaten` = "Kabupaten Bandung"? | Ya |
| **Q3** | `project.kecamatan` = "Baleendah"? | Ya |
| **Q4** | `project.klien` ada data? | Null |
| **Q5** | Normalisasi nama cluster "Arean→Area", "OPEN→Open"? | Ya, baku "FTTH Open Area Rancamanyar RW XX" |
| **Q6** | `cluster.project_type` sumber? | "Non-KSO" (Tracker col O) |
| **Q7** | `cluster.alamat_lengkap` pakai Tracker? | Ya, gabung Kota/Kec/Kel Tracker H-J |
| **Q8** | `tiket_id` wajib — buat tiket_material per cluster? | **Ya (Opsi A)**: `kode_tiket=URxxxxx`, `mos=used=0` |
| **Q9** | `boq_item.gudang_tujuan_id` default? | NULL (nullable) |
| **Q10** | Skip baris material jika semua angka kosong? | Ya, skip; import jika minimal satu angka ada |