# Import BoQ Material FTTH Open Area Rancamanyar - Progress

## FASE 1: Discovery (SELESAI)

### Struktur Database (Prisma Schema)
**Tabel utama:**
- `cluster` (cluster_id PK, project_id FK, nama_cluster, homepass_plan, no_tiket_release, status_aktif)
- `project` (project_id PK, nama_project, cluster_id, area, status_aktif)
- `barang` (barang_id PK, kode_perangkat UNIQUE, nama_barang, kategori_id, satuan_default_id)
- `satuan` (satuan_id PK, kode_satuan UNIQUE) — current: pcs, roll, meter, unit, box
- `boq` (boq_id PK, tiket_id UNIQUE NOT NULL, cluster_id FK, boq_number, status, source)
- `boq_item` (boq_item_id PK, boq_id FK, barang_id FK, qty_rencana Decimal, satuan_id FK, gudang_tujuan_id FK, cluster_id FK)
- `tiket_material` (tiket_id PK, kode_tiket UNIQUE, project_id FK, cluster_id FK, area, mos, used, used_terpasang)
- `additional_adjustment` (adjustment_id PK, project_id FK, barang_id FK, qty Int, alasan, created_by FK) — untuk fitur "Additional"

### Relasi & Kunci Unik
- `cluster.cluster_id` PK (String), unique per project via `@@unique([project_id, nama_cluster])`
- `barang.kode_perangkat` UNIQUE (dengan bracket `[...]`)
- `boq` 1-1 `tiket_material` via `tiket_id` UNIQUE **NOT NULL**
- `boq_item` composite: (boq_id, barang_id) — tapi bisa multiple per cluster via `cluster_id` kolom
- `additional_adjustment` per (project_id, barang_id) — SUM(qty) = total additional

### Data Existing di DB
- **Project**: "FTTH Rancamanyar Tahap 1" (project_id=1, cluster_id=CL001, area=Bandung)
- **Clusters NET-H**: 3 clusters lain (NET-H-005502, 005634, 005712) — bukan Rancamanyar
- **Materials [01-...]**: 9 items exist (e.g., [01-013-13103] TIANG 7 METER)
- **Satuan**: pcs, roll, meter, unit, box — **'batang' BELUM ADA**

### Excel Structure (Verified)
- Sheet: "Rekap BoQ Periode 2026"
- Materials: rows 9-64 (56 items), cols B=Deskripsi, C=Material Code, D=Satuan
- Total formula cols E-I (BoQ Plan, Additional, MOS, Used, Remains) — VALIDATION ONLY
- 13 cluster blocks × 5 cols each [BoQ Plan, Additional, MOS, Used, Remains]:
  - RW01: J-N (col 10-14) cluster NET-H-004396, Project "FTTH Open Area Rancamanyar RW 01", Homepass 353, Tiket NULL (kosong)
  - RW02: O-S (15-19) NET-H-004397, "FTTH Open Area Rancamanyar RW 02", 861, UR10074
  - RW03: T-X (20-24) NET-H-004938, "FTTH OPEN Area Rancamanyar RW 03", 1220, UR10468
  - RW04: Y-AC (25-29) NET-H-004399, "FTTH OPEN Arean Rancamanyar RW 04", 455, UR10558
  - RW05: AD-AH (30-34) NET-H-004400, "FTTH OPEN Arean Rancamanyar RW 05", 400, UR08988
  - RW06: AI-AM (35-39) NET-H-004401, "FTTH OPEN Arean Rancamanyar RW 06", 413, UR09954
  - RW07: AN-AR (40-44) NET-H-004402, "FTTH OPEN Arean Rancamanyar RW 07", 589, UR09786
  - RW09: AS-AW (45-49) NET-H-004404, "FTTH OPEN Arean Rancamanyar RW 09", 555, UR09788
  - RW10: AX-BB (50-54) NET-H-004405, "FTTH OPEN Arean Rancamanyar RW 10", 740, UR12267
  - RW11: BC-BG (55-59) NET-H-004406, "FTTH OPEN Arean Rancamanyar RW 11", 570, UR11024
  - RW14: BH-BL (60-64) NET-H-004409, "FTTH OPEN Arean Rancamanyar RW 14", 1722, UR12741
  - RW15: BM-BQ (65-69) NET-H-004410, "FTTH OPEN Arean Rancamanyar RW 15", 1446, UR11027
  - POP: BR-BV (70-74) MF-H-000141, "POP Rancamanyar Baleendah", NULL, UR11027 (duplicate)

---

## FASE 2: Ekstraksi (SELESAI)

**Script**: `backend/scripts/extract_boq.js` → output `backend/data/boq_extract.json`

**Hasil Ekstraksi:**
- Materials: 56 (rows 9-64)
- Clusters: 13
- Records (material × cluster, non-zero): 385
- Discrepancies: 3 (hanya MOS)

**Discrepancies Detail (diabaikan import):**
| Material | Field | Excel Total | Sum Clusters | Diff | Catatan |
|----------|-------|-------------|--------------|------|---------|
| [01-013-00010] | MOS | 5623 | 0 | 5623 | Semua cluster MOS=0, total kolom G berisi 5623 (data error di Excel) |
| 01-013-01273 | MOS | 740 | 0 | 740 | Sama, total MOS tapi cluster semua 0 |
| 01-013-06350 | MOS | 729 | 0 | 729 | Sama |

---

## FASE 3: Importer - KEPUTUSAN USER & PEMERIKSAAN TEKNIS

| # | Anomali | Keputusan / Hasil Pemeriksaan |
|---|---------|-------------------------------|
| 1 | RW01 tiket kosong | **Pakai placeholder 'TANPA-TIKET-RW01'** (tidak skip, RW01 punya Used data) |
| 2 | UR11027 dobel (RW15 & POP) | **TIDAK BISA share BOQ**: `boq.cluster_id` REQUIRED NOT NULL, `boq.tiket_id` UNIQUE NOT NULL. 1 BOQ = 1 cluster. RW15 pakai UR11027, **POP pakai placeholder 'TANPA-TIKET-POP'**. |
| 3 | RW03 typo NET-H-004938 | **Pakai NET-H-004938 apa adanya**. Catat untuk koreksi lewat UPDATE nanti. |
| 4 | Additional aggregate | **SUM all 13 clusters per material → 1 additional_adjustment per material di project_id=1**. Hanya 2 material: [01-013-13103]=2 (RW01), 01-013-13101=4 (RW05). |
| 5 | Satuan 'batang' | **TIDAK dibuat**. 4 material "Batang" di Excel sudah ada di DB dengan satuan valid: Tiang 7m/6m/9m → **unit**, Pipa Pralon → **meter**. Import menggunakan satuan existing. |
| 6 | MOS total-only 3 material | **Tidak diimpor** (tidak ada data per cluster). Validasi SUM maklumi selisih. |
| 7 | Remains | **Sistem menghitung otomatis**: `mos - (boq + additional)` via `reconciliation.utils.computeRemains()`. |
| 8 | Material [01-013-03725] | **Sudah ada di DB** (kode `[01-013-03725]` dengan bracket tutup). Excel kode `[01-013-03725` missing bracket → matched by name + bracket fix. Semua boq_plan=0 → tidak direferensikan BOQ item. **Tidak dibuat ulang**. |

### Material Matching (Poin 1)
**Kunci pencocokan**: HANYA lewat `kode_perangkat` (exact match dengan bracket). Nama hanya fallback untuk 'In MSP'.
- **55 exact match** (kode dengan bracket sama persis)
- **1 matched by name + bracket fix**: `[01-013-03725` (Excel) → `[01-013-03725]` (DB)
- **0 unmatched** (semua 56 material sudah ada di DB)

**Nama berbeda jauh (hanya spasi)**: CBL-00220/223/226/229/231 (double space vs single), CPT-00914, JTR-02242, JTR-02154 — kode sama, update nama optional.

### Reconciliation MOS Source (Poin 4)
- **Tabel**: `surat_jalan_item` WHERE `tipe='outbound'` AND `tujuan_tipe≠'gudang'` AND `status IN ('disetujui','diterima_didistribusikan')`
- **Existing MOS/Used untuk 13 cluster**: **0 records** (belum ada tiket/BOQ/surat_jalan untuk cluster-cluster ini)
- MOS/Used **TIDAK diimpor sebagai transaksi stok** — biarkan di `boq_extract.json` sebagai referensi

### Database Target (Poin 5)
- **Environment**: Local development (localhost:5432)
- **Database**: `digitak_warehouse` (PostgreSQL)
- **Backup command**: `pg_dump -h localhost -U postgres digitak_warehouse > backup_$(date +%Y%m%d_%H%M%S).sql`
- **Apply**: Harus dalam **satu transaksi** (script sudah menggunakan Prisma transaction)

---

## FASE 3: DRY-RUN RESULT (SELESAI - DIPERBAIKI)

**Script**: `backend/scripts/import_boq.js --dry-run`

### Hasil Dry-Run Summary (Fixed)
| Entity | Created | Updated | Existing | Skipped | Notes |
|--------|---------|---------|----------|---------|-------|
| Satuan | **0** | 0 | 5 | — | 'batang' tidak dibuat, pakai existing |
| Materials | **0** | 0 | 56 | — | Semua 56 sudah ada (55 exact, 1 bracket fix) |
| Clusters | **13** | 0 | 0 | — | Semua 13 cluster NET-H/MF-H baru |
| Tiket | **13** (2 placeholder) | 0 | 0 | — | Placeholder: TANPA-TIKET-RW01, TANPA-TIKET-POP |
| BOQ | **13** | 0 | 0 | — | 1 BOQ per cluster |
| BOQ Items | **353** | 0 | 0 | 0 | 385 records tapi 32 dengan boq_plan=0 di-skip |
| Additional | **2** | 0 | 0 | — | [01-013-13103]=2, 01-013-13101=4 |

### Records Per Cluster (353 total boq_item) — Angka Kontrol Verifikasi
| Cluster | Nama | BOQ Items (boq_plan > 0) |
|---------|------|-------------------------|
| NET-H-004396 | FTTH Open Area Rancamanyar RW 01 | **27** |
| NET-H-004397 | FTTH Open Area Rancamanyar RW 02 | **30** |
| NET-H-004938 | FTTH OPEN Area Rancamanyar RW 03 | **28** |
| NET-H-004399 | FTTH OPEN Area Rancamanyar RW 04 | **29** |
| NET-H-004400 | FTTH OPEN Arean Rancamanyar RW 05 | **27** |
| NET-H-004401 | FTTH OPEN Arean Rancamanyar RW 06 | **26** |
| NET-H-004402 | FTTH OPEN Arean Rancamanyar RW 07 | **28** |
| NET-H-004404 | FTTH OPEN Arean Rancamanyar RW 09 | **29** |
| NET-H-004405 | FTTH OPEN Arean Rancamanyar RW 10 | **26** |
| NET-H-004406 | FTTH OPEN Arean Rancamanyar RW 11 | **26** |
| NET-H-004409 | FTTH OPEN Arean Rancamanyar RW 14 | **28** |
| NET-H-004410 | FTTH OPEN Arean Rancamanyar RW 15 | **26** |
| MF-H-000141 | POP Rancamanyar Baleendah | **23** |
| **Total** | | **353** |

**Checksum**: `SUM(qty_rencana) = 43269` (satuan campur, hanya checksum)

### Target Tables & Columns (Confirmed)
| Excel Metric | DB Target | Storage Method |
|--------------|-----------|----------------|
| BoQ Plan | `boq_item.qty_rencana` | Per cluster via BOQ (1 BOQ = 1 cluster) |
| Additional | `additional_adjustment.qty` | Aggregate SUM per material di project_id=1 |
| MOS | — | Computed from `surat_jalan_item` outbound (reconciliation) |
| Used | — | Computed from `laporan_mitra.used` (reconciliation) |
| Remains | — | **Auto-computed**: `mos - (boq + additional)` |

### Reconciliation Reads Additional From
- `additionalRepository.getAdditionalTotalsByProject(projectIds)` → SUM `additional_adjustment.qty` per project+barang
- Ditambah inbound kelebihan (`is_kelebihan=true` approved)
- **Import approach valid**: aggregate per material di project_id=1 sudah benar

---

## FASE 4: EKSEKUSI DAN VERIFIKASI (DITUNDA - SATUAN MISMATCH)

**Perintah**: `node scripts/import_boq.js --apply`

**Verifikasi Pasca-Import (Angka Kontrol):**
1. **Cluster**: 13 baru
2. **Tiket**: 13 (11 dari file + 2 placeholder)
3. **BOQ**: 13
4. **BOQ Items**: 353 (per cluster: 27,30,28,29,27,26,28,29,26,26,28,26,23)
5. **SUM(qty_rencana)**: 43269
6. **Additional Adjustment**: 2 baris (Tiang 7m=2, Tiang 9m=4)
7. **Idempotency test**: Jalankan importer sekali lagi → **harus 0 created**

---

### PEMERIKSAAN SATUAN FINAL (2026-10-09) — TERKINI

**Script**: `backend/analyze_satuan.js` (fixed bracket matching)

**Hasil**: **27 ketidakcocokan satuan** ditemukan. Terklasifikasi:

| Kelompok | Kriteria | Jumlah Material | BOQ Items |
|----------|----------|-----------------|-----------|
| **A** | Hitungan sama (pcs↔unit, batang→unit untuk Tiang) | **16** | **112** |
| **B** | Arti kuantitas berbeda (pcs vs meter, meter vs roll, unit vs roll, unit vs box, batang vs meter) | **11** | **68** |

---

#### KELOMPOK A: HITUNGAN SAMA (16 material, 112 BOQ items)
> Semantik qty sama (pcs=unit, batang=unit untuk Tiang). DB tidak diubah; impor pakai satuan DB existing.

| # | Kode Excel → DB | Nama | Excel | DB | BOQ Items | Total BoQ Plan |
|---|-----------------|------|-------|-----|-----------|----------------|
| 1 | 00-013-13404 → 00-013-13404 | 1:8 Splitter WITH CONNECTOR INPUT | pcs | unit | 11 | 769 |
| 2 | [01-013-13104] → [01-013-13104] | TIANG 6 METER | batang | unit | 12 | 628 |
| 3 | [01-013-13103] → [01-013-13103] | TIANG 7 METER | batang | unit | 13 | 378 |
| 4 | SPP-00100 → SPP-00100 | BRACKET X-FRAME BEHEL MINI | pcs | unit | 11 | 230 |
| 5 | 01-013-00033 → 01-013-00033 | ADAPTER LC/UPC DUPLEX AUTO SHUTTER | unit | pcs | 1 | 147 |
| 6 | CPT-00655 → CPT-00655 | BRACKET X-FRAME BEHEL 12X65X65 | pcs | unit | 12 | 117 |
| 7 | 01-013-00225 → 01-013-00225 | 1:8 balanced PLC Splitter | pcs | unit | 12 | 117 |
| 8 | JTR-02242 → JTR-02242 | PATCHCORD LC/UPC-SC/UPC 3M | pcs | unit | 12 | 117 |
| 9 | CPT-00630 → CPT-00630 | BRACKET COILAN X-FRAME | pcs | unit | 13 | 62 |
| 10 | In MSP → In MSP | Precon 3m (Produksi in-House MSP) | pcs | unit | 10 | 43 |
| 11 | 01-013-00004 → 01-013-00004 | 1*8 PLC SPLITTER 1:8 | pcs | unit | 1 | 34 |
| 12 | 90000151 → 90000151 | BRACKET SALIB BARU | pcs | unit | 1 | 20 |
| 13 | CPT-00674 → CPT-00674 | CAGE NUT MUR + RING 6 | unit | pcs | 1 | 12 |
| 14 | 01-013-13101 → 01-013-13101 | TIANG 9 METER | batang | unit | 1 | 3 |
| 15 | 29000006 → 29000006 | HOSE CLAMP/KLEM SELANG | unit | pcs | 1 | 3 |
| 16 | [01-013-03725 → [01-013-03725] | PLC SPLITTER 1X8 SC/UPC | pcs | unit | 0 | 0 |

---

#### KELOMPOK B: ARTI KUANTITAS BERBEDA (11 material, 68 BOQ items)
> **Perlu resolusi manual** sebelum import. Qty Excel tidak langsung kompatibel dengan satuan DB.

| # | Kode | Nama | Excel | DB | BOQ Items | Total BoQ Plan | Catatan |
|---|------|------|-------|-----|-----------|----------------|---------|
| 1 | CBL-00220 | KABEL DROPCORE 100M | pcs | meter | 12 | 323 | Kabel: pcs (potong) vs meter |
| 2 | CBL-00223 | KABEL DROPCORE 150M | pcs | meter | 12 | 215 | Kabel: pcs (potong) vs meter |
| 3 | CBL-00226 | KABEL DROPCORE 200M | pcs | meter | 12 | 91 | Kabel: pcs (potong) vs meter |
| 4 | CBL-00225 | KABEL DROPCORE 75M | pcs | meter | 8 | 80 | Kabel: pcs (potong) vs meter |
| 5 | CBL-00229 | KABEL DROPCORE 250M | pcs | meter | 10 | 28 | Kabel: pcs (potong) vs meter |
| 6 | CBL-00215 | KABEL DROPCORE 50M | pcs | meter | 6 | 19 | Kabel: pcs (potong) vs meter |
| 7 | 90000156 | KSS Spiral Wrapping Band 10m | unit | roll | 1 | 14 | unit vs roll (konversi?) |
| 8 | CPT-00753 | FLEXIBLE WP 1/2" INCH | meter | roll | 1 | 5 | meter vs roll (konversi?) |
| 9 | CBL-00231 | KABEL DROPCORE 300M | pcs | meter | 4 | 4 | Kabel: pcs (potong) vs meter |
| 10 | 90000163 | Nylon Cable Tie 3.6x300mm | unit | box | 1 | 1 | unit vs box (isi per box?) |
| 11 | CPT-00533 | Pipa Pralon 1,5inch | batang | meter | 1 | 1 | batang vs meter (panjang per batang?) |

---

#### EXISTING DATA CHECK: KABEL DROPCORE (Group B - pcs vs meter)

**boq_item (existing):**
| Kode | Nama | Count | Satuan DB | Min | Median | Max |
|------|------|-------|-----------|-----|--------|-----|
| CBL-00229 | KABEL DROPCORE 250M | 1 | meter | 12 | 12 | 12 |
| CBL-00231 | KABEL DROPCORE 300M | 1 | meter | 35 | 35 | 35 |
| CBL-00225 | KABEL DROPCORE 75M | 1 | **unit** | 20 | 20 | 20 |
| CBL-00215 | KABEL DROPCORE 50M | 0 | — | — | — | — |
| CBL-00220 | KABEL DROPCORE 100M | 0 | — | — | — | — |
| CBL-00223 | KABEL DROPCORE 150M | 0 | — | — | — | — |
| CBL-00226 | KABEL DROPCORE 200M | 0 | — | — | — | — |

**surat_jalan_item (outbound, approved, tujuan≠gudang):**
| Kode | Count |
|------|-------|
| Semua 7 kabel | **0 records** (no data) |

**Observasi:**
- CBL-00225 di DB pakai `unit` (bukan `meter`), qty=20 → konsisten dengan "pcs/potong"
- CBL-00229 & CBL-00231 di DB pakai `meter`, qty=12 & 35 → bisa jadi meter atau potong
- **Tidak ada data surat_jalan** untuk validasi konversi meter↔pcs
- **Perlu keputusan bisnis**: 1 pcs = 1 potong (panjang bervariasi 50-300m) vs meter aktual

---

### RINGKASAN

| Kelompok | Material | BOQ Items | Status |
|----------|----------|-----------|--------|
| A (sama) | 16 | 112 | ✅ Bisa import pakai satuan DB existing |
| B (berbeda) | 11 | 68 | ❌ **BLOKIR** - perlu resolusi manual |

**TOTAL**: 27 material, 180 BOQ items (112 + 68)

---

**STATUS**: ❌ **TIDAK BISA LANJUT KE FASE 4**. 
- Kelompok A (16 material) aman untuk import
- Kelompok B (11 material, termasuk 7 kabel + Pipa Pralon + 3 lainnya) **HARUS diselesaikan dulu**

**Catatan khusus Pipa Pralon (CPT-00533)**: Excel `batang` (1) vs DB `meter` — perlu cek manual panjang per batang untuk konversi.