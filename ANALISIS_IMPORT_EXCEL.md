# ANALISIS FILE EXCEL IMPORT - LAPORAN LENGKAP

**File:** `D:\Project\digitak-warehouse\data import.xlsx`  
**Tanggal analisis:** 2026-10-09  
**Mode:** READ-ONLY (tidak ada data/file yang diubah)

---

## 1. RINGKASAN FILE (Sheet, Ukuran)

| Sheet | State | Baris | Kolom | Dimensions | Merged Cells |
|-------|-------|-------|-------|------------|--------------|
| **Rekap BoQ Periode 2026** | visible | 1013 | 74 | 2:B - 79:BV | 66 |
| **Tracker** | hidden | 880 | 84 | 1:A - 680:CE | 2 |
| **Hubbox** | hidden | 1000 | 24 | 2:A - 78:X | 1 |

**Library tersedia di backend:** `exceljs` ^4.4.0, `xlsx` ^0.18.5

---

## 2. FORMAT PROJECT (dari sheet "Rekap BoQ Periode 2026")

### Struktur Header (Multi-row, baris 1-8):
| Baris | Isi |
|-------|-----|
| 1 | Judul: "Compile All BOQ Material FTTH-OPEN-AREA RANCAMANYAR (PT. METANOUVA INFORMATIKA)" |
| 2 | **Cluster ID** (13 unik, tiap cluster 5 kolom) |
| 3 | **Nama Cluster/Project** (nama per RW) |
| 4 | **Homepass Plan** (angka per cluster) |
| 5 | **No. Tiket Release** (kode tiket per cluster) |
| 6 | (kosong) |
| 7 | Group header: "Summary All Qty Material" / "Qty Material" |
| 8 | **Kolom detail per cluster**: BoQ Plan, Additional, MOS, Used, Remains (5 kolom × 13 cluster = 65 kolom) + 5 kolom summary (E-I) |

### Data Project (baris 67-79):
Baris 67-79 berisi catatan/ketentuan, **bukan data project**. Sheet ini **hanya punya 1 project induk** di judul: **"FTTH-OPEN-AREA RANCAMANYAR"**. Project-project RW (01-15, POP) tercatat sebagai **cluster** di baris 2-5.

**Contoh nama cluster (dari baris 3):**
- FTTH Open Area Rancamanyar RW 01
- FTTH Open Area Rancamanyar RW 02
- ...
- FTTH OPEN Arean Rancamanyar RW 15
- POP Rancamanyar Baleendah

### Identifikasi Project:
- **Satu project induk** di judul (baris 1)
- **13 cluster** di bawahnya (RW 01-15 + POP)
- Project **tidak diulang** per baris; cluster diidentifikasi oleh **Cluster ID** (NET-H-XXXXXX, MF-H-XXXXXX) di baris 2
- Merged cells: setiap cluster span 5 kolom (J2:N2, O2:S2, dst.)

### Cocokan dengan `schema.prisma` (model `project`):
| Field DB | Sumber Excel | Status |
|----------|--------------|--------|
| `nama_project` | Judul baris 1 | ✅ Cocok |
| `title` | - | ❌ Belum ada |
| `cluster_id` | Cluster ID baris 2 | ⚠️ Perlu transformasi (cluster punya field sendiri) |
| `area` | "Rancamanyar" dari nama cluster | ⚠️ Perlu ekstraksi |
| `kota_kabupaten` | "Kabupaten Bandung" (asumsi) | ❌ Belum ada eksplisit |
| `kecamatan` | "Baleendah" (asumsi) | ❌ Belum ada eksplisit |
| `desa_kelurahan` | "Rancamanyar" | ❌ Belum ada eksplisit |
| `provinsi` | "Jawa Barat" | ❌ Belum ada eksplisit |

---

## 3. FORMAT CLUSTER

### Dari sheet "Rekap BoQ Periode 2026" (13 cluster):

| Cluster ID | Nama Cluster | Homepass | Tiket Release | Kolom |
|------------|--------------|----------|---------------|-------|
| NET-H-004396 | FTTH Open Area Rancamanyar RW 01 | 353 | - | J-N |
| NET-H-004397 | FTTH Open Area Rancamanyar RW 02 | 861 | UR10074 | O-S |
| NET-H-004938 | FTTH OPEN Area Rancamanyar RW 03 | 1220 | UR10468 | T-X |
| NET-H-004399 | FTTH OPEN Area Rancamanyar RW 04 | 455 | UR10558 | Y-AC |
| NET-H-004400 | FTTH OPEN Arean Rancamanyar RW 05 | 400 | UR08988 | AD-AH |
| NET-H-004401 | FTTH OPEN Arean Rancamanyar RW 06 | 413 | UR09954 | AI-AM |
| NET-H-004402 | FTTH OPEN Arean Rancamanyar RW 07 | 589 | UR09786 | AN-AR |
| NET-H-004404 | FTTH OPEN Arean Rancamanyar RW 09 | 555 | UR09788 | AS-AW |
| NET-H-004405 | FTTH OPEN Arean Rancamanyar RW 10 | 740 | UR12267 | AX-BB |
| NET-H-004406 | FTTH OPEN Arean Rancamanyar RW 11 | 570 | UR11024 | BC-BG |
| NET-H-004409 | FTTH OPEN Arean Rancamanyar RW 14 | 1722 | UR12741 | BH-BL |
| NET-H-004410 | FTTH OPEN Arean Rancamanyar RW 15 | 1446 | UR11027 | BM-BQ* |
| MF-H-000141 | POP Rancamanyar Baleendah | - | UR11027 | BR-BV |

*Note: NET-H-004410 hanya 1 kolom (BP) - INCOMPLETE (missing Additional, MOS, Used, Remains)

### Dari sheet "Tracker" (97 cluster - dataset lebih lengkap):

Cluster memiliki field lengkap:
- `Cluster ID` (NET-H-xxxxx, KSO-H-xxxxx, NET-B-xxxxx, KSO-B-xxxxx)
- `Cluster / Funnel Name`
- `Project Name` (sama dengan cluster name di data ini)
- `FTTX Type` (FTTH)
- `Metode` (Cascade, Reverse, QODN)
- `Kota`, `Kecamatan`, `Kelurahan`
- `Cluster Type` (Open Area)
- `HP Estimate` (angka)
- `Project Type` (Non-KSO / KSO)
- `KSO Partner`, `KSO Contact`
- `Vendor`
- `Project Status`, `Gap Project Status`, dll.

### Cocokan dengan `schema.prisma` (model `cluster`):

| Field DB | Sumber BoQ Sheet | Sumber Tracker Sheet | Status |
|----------|------------------|---------------------|--------|
| `cluster_id` | Baris 2 (NET-H-xxxxx) | Kolom C | ✅ Cocok |
| `project_id` | Perlu lookup dari project | Perlu lookup | ⚠️ Perlu mapping |
| `nama_cluster` | Baris 3 | Kolom B | ✅ Cocok |
| `cluster_type` | - | Kolom K | ⚠️ Hanya di Tracker |
| `project_type` | - | Kolom O | ⚠️ Hanya di Tracker |
| `kso_partner` | - | Kolom P | ⚠️ Hanya di Tracker |
| `kso_contact` | - | Kolom Q | ⚠️ Hanya di Tracker |
| `vendor` | - | Kolom R | ⚠️ Hanya di Tracker |
| `alamat_lengkap` | - | Kota/Kec/Kel (H-J) | ⚠️ Perlu gabung |
| `homepass_plan` | Baris 4 | Kolom L | ✅ Cocok (BoQ lebih lengkap) |
| `status_aktif` | - | Project Status (S) | ⚠️ Perlu mapping |
| `no_tiket_release` | Baris 5 | - | ✅ Hanya di BoQ |

---

## 4. FORMAT ANGKA: BOQ, ADDITIONAL, MOS, USED, REMAINS

### Struktur Kolom (per cluster, 5 kolom):
| Posisi | Header (Row 8) | Tipe Data | Keterangan |
|--------|----------------|-----------|------------|
| 1 | BoQ Plan | Integer (formula SUMIF) | Rencana dari WO email |
| 2 | Additional | Integer (sparse, banyak kosong) | Penambahan di luar WO |
| 3 | MOS | Integer (formula SUMIF) | Material On Site (terima SJ) |
| 4 | Used | Integer (sparse, banyak kosong) | Terpakai implementasi |
| 5 | Remains | **Formula**: `MOS - Additional - BoQ Plan` | Sisa material |

### Kolom Summary (E-I, dihitung via SUMIF across all clusters):
- **E (BoQ Plan)**: `SUMIF($J$8:$XFD$8,$E$8,J9:XFD9)` → Total BoQ Plan all cluster
- **F (Additional)**: `SUMIF($J$8:$XFD$8,$F$8,J9:XFD9)` → Total Additional all cluster
- **G (MOS)**: `SUMIF($J$8:$XFD$8,$G$8,J9:XFD9)` → Total MOS all cluster
- **H (Used)**: `SUMIF($J$8:$XFD$8,$H$8,J9:XFD9)` → Total Used all cluster
- **I (Remains)**: `G - F - E` (formula: `G9-F9-E9`) → Summary Remains

### Contoh Data (Row 9 - TIANG 7 METER):
| Cluster | BoQ Plan | Additional | MOS | Used | Remains (formula) |
|---------|----------|------------|-----|------|-------------------|
| Summary (E-I) | 378 | 2 | 378 | 15 | -2 |
| NET-H-004396 (J-N) | 9 | 2 | 9 | 15 | -2 |
| NET-H-004397 (O-S) | 27 | 0 | 27 | 0 | 0* |
| NET-H-004938 (T-X) | 20 | 0 | 20 | 0 | 0* |
| ... | ... | ... | ... | ... | ... |

*Formula Remains per cluster: `MOS - Additional - BoQ Plan` (kolom N, S, X, AC, AH, AM, AR, AW, BB, BG, BL, BQ, BV)

### Cek Konsistensi Rumus:
- **Rumus terlihat**: `Remains = MOS - Additional - BoQ Plan` (baik summary maupun per cluster)
- **Hasil cek 49 material × 13 cluster**: **1 match, 0 mismatch** (hanya 1 baris yang punya data lengkap untuk dicek; mostly sparse data)
- **Catatan**: Banyak kolom Additional/Used kosong (0 atau blank), formula tetap jalan

### Statistik Kolom Angka (sample 49 material):
| Kolom | Terisi | Kosong | Min | Max |
|-------|--------|--------|-----|-----|
| BoQ Plan (per cluster) | ~60% | ~40% | 0 | 1722 |
| Additional (per cluster) | ~2% | ~98% | 0 | 2 |
| MOS (per cluster) | ~60% | ~40% | 0 | 1722 |
| Used (per cluster) | ~0% | ~100% | - | - |
| Remains (per cluster) | 93% (formula) | 7% | -1926 | 378 |

**Format nilai angka:**
- Tipe: Integer (bulat)
- Satuan: Mengikuti kolom D (Satuan: Batang, Unit, Meter, Pcs, Rol)
- Tidak ada pemisah ribuan, tidak ada negatif di input (negatif hanya di hasil formula Remains)
- Tidak ada teks campur angka (seperti "1.200 m") - sudah bersih

---

## 5. TABEL PEMETAAN EXCEL → DATABASE

### 5.1 Project & Cluster

| Kolom Excel | Tabel.Field DB | Status | Catatan |
|-------------|----------------|--------|---------|
| Judul baris 1 | `project.nama_project` | ✅ Cocok | "FTTH-OPEN-AREA RANCAMANYAR" |
| - | `project.title` | ❌ Belum ada | Bisa diisi dari judul |
| Cluster ID (baris 2) | `cluster.cluster_id` | ✅ Cocok | PK string |
| Nama Cluster (baris 3) | `cluster.nama_cluster` | ✅ Cocok | |
| Homepass Plan (baris 4) | `cluster.homepass_plan` | ✅ Cocok | Integer |
| Tiket Release (baris 5) | `cluster.no_tiket_release` | ✅ Cocok | String |
| - | `cluster.project_id` | ⚠️ Perlu transformasi | FK ke project, perlu lookup/insert project dulu |
| - | `cluster.cluster_type` | ⚠️ Hanya di Tracker | "Open Area" dari Tracker col K |
| - | `cluster.project_type` | ⚠️ Hanya di Tracker | "Non-KSO"/"KSO" dari Tracker col O |
| - | `cluster.kso_partner` | ⚠️ Hanya di Tracker | Dari Tracker col P |
| - | `cluster.kso_contact` | ⚠️ Hanya di Tracker | Dari Tracker col Q |
| - | `cluster.vendor` | ⚠️ Hanya di Tracker | Dari Tracker col R |
| - | `cluster.alamat_lengkap` | ⚠️ Perlu gabung | Kota/Kec/Kel dari Tracker H-J |
| - | `cluster.status_aktif` | ⚠️ Perlu mapping | Dari Tracker Project Status (S) |

### 5.2 Material (BOQ Items)

| Kolom Excel | Tabel.Field DB | Status | Catatan |
|-------------|----------------|--------|---------|
| Material Code (col C) | `barang.kode_perangkat` | ✅ **49/49 MATCH** | Semua kode cocok di DB! |
| Deskripsi (col B) | `barang.nama_barang` | ✅ Cocok | Nama identik |
| Satuan (col D) | `satuan.kode_satuan` | ⚅ Perlu mapping | "Batang"→unit, "Meter"→meter, "Pcs"→pcs, "Unit"→unit, "Rol"→roll |
| - | `boq_item.qty_rencana` | ⚠️ Perlu transformasi | Dari BoQ Plan per cluster |
| - | `boq_item.cluster_id` | ✅ Cocok | FK ke cluster |
| - | `boq_item.barang_id` | ✅ Cocok | FK ke barang (via kode_perangkat) |
| - | `boq_item.satuan_id` | ⚠️ Perlu lookup | Dari barang.satuan_default_id |
| - | `boq_item.gudang_tujuan_id` | ❌ Belum ada | Perlu tentukan gudang default |

### 5.3 Angka BOQ/Additional/MOS/Used/Remains → Database

| Angka Excel | Field DB Saat Ini | Status |
|-------------|-------------------|--------|
| **BoQ Plan** (per cluster per material) | `boq_item.qty_rencana` | ✅ Cocok (rename: qty_rencana = BoQ Plan) |
| **Additional** | `additional_adjustment.qty` | ⚠️ Tabel terpisah, per project+barang, bukan per cluster |
| **MOS** | `tiket_material.mos` | ⚠️ Di tiket_material, bukan per item material |
| **Used** | `tiket_material.used` / `surat_jalan_item.qty` | ⚠️ Terdistribusi di beberapa tabel |
| **Remains** | `reconciliation_upload_detail.remains_lapangan` / `laporan_mitra.remains_lapangan` | ⚠️ Di tabel rekonsiliasi/laporan, bukan BOQ |

**KESIMPULAN:** Database **belum memiliki struktur terpusat** untuk menyimpan ke-5 angka ini **per cluster per material**. Saat ini:
- `boq_item.qty_rencana` = BoQ Plan ✅
- Additional, MOS, Used, Remains **belum ada field dedikasi** di `boq_item` atau tabel BOQ per cluster

---

## 6. CEK KECOCOKAN DATABASE (READ-ONLY)

### Project:
| Project Excel | Project DB | Status |
|---------------|------------|--------|
| "FTTH-OPEN-AREA RANCAMANYAR" | "FTTH Rancamanyar Tahap 1" (ID:1) | ⚠️ Mirip tapi beda nama (Tahap 1 vs Open Area) |
| - | 10 project lain di DB | - |

**Project dari Excel BELUM ADA di database** (nama beda).

### Cluster (13 dari BoQ sheet vs 13 di DB):

| Cluster ID Excel | Cluster ID DB | Status |
|------------------|---------------|--------|
| NET-H-004396 | - | ❌ BELUM ADA |
| NET-H-004397 | - | ❌ BELUM ADA |
| NET-H-004938 | - | ❌ BELUM ADA |
| NET-H-004399 | - | ❌ BELUM ADA |
| NET-H-004400 | - | ❌ BELUM ADA |
| NET-H-004401 | - | ❌ BELUM ADA |
| NET-H-004402 | - | ❌ BELUM ADA |
| NET-H-004404 | - | ❌ BELUM ADA |
| NET-H-004405 | - | ❌ BELUM ADA |
| NET-H-004406 | - | ❌ BELUM ADA |
| NET-H-004409 | - | ❌ BELUM ADA |
| NET-H-004410 | - | ❌ BELUM ADA |
| MF-H-000141 | - | ❌ BELUM ADA |

**SEMUA 13 CLUSTER DARI BOQ SHEET BELUM ADA DI DATABASE.**

Cluster di DB (13): CL001-CL005, NET-H-005502, NET-H-005634, NET-H-005712, NET-J-003318, NET-J-004521, NET-J-004618, BJNG-0230, BLND-23086 → **Kode format berbeda** (CLxxx vs NET-H-xxxxx).

### Material (49 kode dari BoQ):
✅ **49/49 MATCH** dengan `barang.kode_perangkat` di database.

---

## 7. MASALAH DATA & RISIKO

| # | Masalah | Dampak | Rekomendasi |
|---|---------|--------|-------------|
| 1 | **Project tidak ada di DB** | Perlu insert project baru sebelum cluster | Insert project dulu, dapatkan project_id |
| 2 | **13 cluster baru (NET-H-xxxxx)** | Belum ada di DB, beda format dengan CLxxx | Insert cluster baru, link ke project_id |
| 3 | **Cluster NET-H-004410 incomplete** | Hanya 1 kolom (BoQ Plan), missing 4 kolom | Cek file asli, minta perbaikan |
| 4 | **Additional/Used mayoritas kosong** | Data sparse, formula Remains jadi negatif | Tentukan default 0, validasi input |
| 5 | **Nama cluster typo** | "Arean" vs "Area" (RW 05-15), "OPEN" vs "Open" | Normalisasi nama sebelum insert |
| 6 | **Merged cells di header** | 66 merged ranges, baca header butuh logika khusus | Baca row 2,3,4,5,8 secara eksplisit |
| 7 | **Formula SUMIF di summary** | Nilai summary tergantung range cluster | Hitung ulang di code, jangan ambil nilai formula |
| 8 | **Tracker sheet punya 97 cluster** | Dataset berbeda, mana yg master? | Perlu keputusan: import dari sheet mana? |
| 9 | **Satuan teks tidak konsisten** | "Batang", "Pcs", "Unit", "Rol (50)", "Meter" | Mapping ke `satuan.kode_satuan` (pcs, meter, unit, roll, box) |
| 10 | **Remains negatif** | Formula `MOS - Add - BoQ` bisa negatif | Validasi bisnis: apakah wajar? |
| 11 | **Tabel BOQ Item belum punya field Additional/MOS/Used/Remains** | Perlu alter schema atau tabel baru | Rancang skema penyimpanan 5 angka ini |
| 12 | **Hidden sheets (Tracker, Hubbox)** | Data kaya tapi tersembunyi | Baca via library (exceljs support hidden) |

---

## 8. PERTANYAAN UNTUK KEPUTUSAN

| # | Pertanyaan | Butuh Jawaban |
|---|------------|---------------|
| **Q1** | **Sheet mana yang master untuk Cluster?** BoQ sheet (13 cluster) atau Tracker sheet (97 cluster)? | Ya/Tidak + Pilih sheet |
| **Q2** | **Project "FTTH-OPEN-AREA RANCAMANYAR"**: insert baru atau update "FTTH Rancamanyar Tahap 1" (ID:1)? | Insert baru / Update existing |
| **Q3** | **Format Cluster ID**: pakai format NET-H-xxxxx (dari Excel) atau CLxxx (format DB existing)? | NET-H-xxxxx / CLxxx / Lainnya |
| **Q4** | **Field Additional/MOS/Used/Remains**: simpan di mana? (a) Tambah kolom di `boq_item`, (b) Tabel baru `cluster_material_qty`, (c) Tabel `boq` per cluster, (d) Lainnya | a/b/c/d + detail |
| **Q5** | **Cluster NET-H-004410 incomplete** (hanya BoQ Plan): skip, isi 0, atau minta file diperbaiki? | Skip / Isi 0 / Minta perbaiki |
| **Q6** | **Satuan mapping**: "Batang"→unit(4), "Pcs"→pcs(1), "Unit"→unit(4), "Meter"→meter(3), "Rol (50)"→roll(2) - setuju? | Ya / Perbaiki mapping |
| **Q7** | **Remains negatif**: apakah diizinkan atau harus divalidasi (MOS ≥ BoQ+Additional)? | Izinkan / Validasi error / Warning saja |
| **Q8** | **Tracker sheet data lokasi (Kota/Kec/Kel)**: digunakan untuk `cluster.alamat_lengkap` atau `project` fields? | Ya, gunakan / Tidak |
| **Q9** | **Tiket Release** (URxxxxx): simpan di `cluster.no_tiket_release` atau di `tiket_material.kode_tiket`? | cluster / tiket_material / keduanya |
| **Q10** | **Import mode**: satu kali full import, atau incremental/update berkala? | One-time / Incremental |

---

## KONFIRMASI

✅ **Tidak ada file Excel yang diubah**  
✅ **Tidak ada schema/database yang diubah**  
✅ **Tidak ada kode aplikasi yang ditulis**  
✅ **Script sementara sudah dihapus** (`tmp-analyze-excel.js`, `tmp-check-db.js`)  
✅ **Hanya analisis read-only dilakukan**