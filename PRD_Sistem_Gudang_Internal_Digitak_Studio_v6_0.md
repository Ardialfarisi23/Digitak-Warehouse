---
title: "PRODUCT REQUIREMENT DOCUMENT"
subtitle: "Rancangan Web Sistem Manajemen Gudang Internal Perangkat IT & Infrastruktur — PT Metanouva Informatika (Digitak Studio)"
---

| | |
|---|---|
| **Versi Dokumen** | 6.0 — Rancangan Web Terkonsolidasi |
| **Tanggal** | 19 September 2026 |
| **Versi Sebelumnya** | 5.2 (7 September 2026) |
| **Status** | Living Document — menggabungkan implementasi aktual, 23 keputusan pembaruan, dan rencana modul Auditor |

# 0. Tentang Dokumen Ini

PRD v6.0 disusun ulang sebagai **dokumen baru yang berdiri sendiri** untuk menjelaskan rancangan web sistem gudang internal. Dokumen ini menggantikan PRD v5.0 dan v5.2 (yang berlaku sebagai dokumen historis). Bila ada konflik antara v5.x dan v6.0, **v6.0 yang berlaku**.

Sumber penyusunan:

1. PRD v5.0 (rekonsiliasi dengan implementasi aktual, 4 September 2026)
2. PRD v5.2 (addendum Gudang Dadakan dan revisi minor tim perusahaan, 7 September 2026)
3. Daftar 23 keputusan pembaruan PRD ↔ implementasi
4. Rancangan role Auditor dan modul Stock Opname

## 0.1 Penanda Status

Setiap fitur/aturan diberi penanda agar jelas posisinya:

| Penanda | Arti |
|---|---|
| **[AKTUAL]** | Sudah terimplementasi dan terverifikasi pada v5.0/v5.2 |
| **[DITETAPKAN]** | Keputusan sudah final; PRD dan/atau implementasi harus mengikuti |
| **[VALIDASI]** | Ditetapkan sementara; perlu pengecekan kode/workflow sebelum dikunci |
| **[USULAN]** | Rancangan baru, belum diimplementasikan, menunggu konfirmasi |
| **[DEPRECATED]** | Tidak dipakai lagi; dibersihkan dari desain aktif |

## 0.2 Ringkasan Perubahan v5.2 → v6.0

| # | Area | Perubahan | Status |
|---|---|---|---|
| 1 | Audit Log | Semua aktivitas semua user tercatat (comprehensive logging); filter `kode_tiket` menelusuri seluruh entity; aksi `update_mos_mitra` tidak lagi ditulis oleh sistem, nilai enum dipertahankan sementara agar baris audit_log lama tetap valid | DITETAPKAN |
| 2 | Hak akses gudang | Konsep `gudang_ids` diganti aturan berbasis role + penugasan gudang | DITETAPKAN |
| 3 | Keamanan akun | `must_change_password` menjadi fitur resmi | DITETAPKAN |
| 4 | Status Surat Jalan | 8 status dipertahankan, wajib didokumentasikan state transition-nya | VALIDASI |
| 5 | Field Surat Jalan | `tipe_pengirim`, `tujuan_tipe`, `titik_lapangan_id`, `alamat_lapangan`, `supplier_id` dipertahankan | DITETAPKAN |
| 6 | MOS | Trigger MOS pada rekonsiliasi = barang didistribusikan ke lapangan/project (bukan approval inbound) | DITETAPKAN (definisi teknis final: VALIDASI) |
| 7 | Used | Dari *automatic calculation* berbasis outbound menjadi *reported actual usage* dari laporan mitra | DITETAPKAN |
| 8 | Laporan Mitra | Entity `laporan_mitra` baru, mekanisme *append* (bukan overwrite), enum `jenis_laporan`, format Excel 5 kolom, template Excel aktif, 1 laporan/hari | DITETAPKAN |
| 9 | Notifikasi | Notifikasi outbound dan reject dipertahankan; trigger/penerima harus didokumentasikan | DITETAPKAN |
| 10 | Field legacy | `used_terpasang` (tiket_material & reconciliation_upload_detail) dihapus dari desain aktif | DEPRECATED |
| 11 | Selisih | `Selisih = MOS Sistem − MOS Mitra` dengan sumber nilai mengikuti arsitektur baru | DITETAPKAN |
| 12 | Remains | Formula belum dikunci; wajib tracing | VALIDASI |
| 13 | Gudang Dadakan | Disesuaikan dengan keputusan implementasi terbaru (lihat 6.7) | DITETAPKAN |
| 14 | Role Auditor | Role ke-4 + modul Stock Opname & Audit Persediaan | USULAN |
| 15 | Addendum v5.2 yang digantikan | Logika Used otomatis (v5.2 §14.4 dan §15.1.5) dicabut karena tidak sejalan dengan keputusan #7 | DITETAPKAN |

> **Catatan konflik yang sudah diselesaikan:** v5.2 memuat dua usulan logika Used otomatis dari outbound (per jenis transaksi di §14.4; per status terkirim di §15.1.5) yang saling bertabrakan. Keduanya **dicabut**. Used kini hanya berasal dari laporan mitra (bagian 6.6 dan 8).

# 1. Ringkasan Eksekutif

Sistem Manajemen Gudang Internal Digitak Studio adalah aplikasi web full-stack yang mengelola siklus hidup perangkat IT & infrastruktur: penerimaan (inbound), penempatan fisik (putaway/zona), pengiriman ke site (outbound), perencanaan (BOQ/Tiket Gudang), rekonsiliasi dengan laporan mitra pelaksana, dan — mulai v6.0 — audit persediaan (Stock Opname).

**Pernyataan tujuan produk:** menjadi sistem manajemen gudang yang cukup dalam untuk menggantikan pencatatan manual sepenuhnya, namun cukup sederhana untuk dipakai tanpa tim IT eksternal dan tanpa pelatihan panjang.

**Prinsip rancangan:**

- Sistem sepenuhnya internal (single-tenant); tidak ada akses pihak eksternal/klien/mitra.
- Semua aktivitas user tercatat (audit trail komprehensif).
- Data historis tidak dihapus (soft delete, log append-only).
- Stok gudang dan progres di lapangan dibedakan tegas: **stok gudang** = barang di gudang; **MOS/Used** = barang di lapangan/project.

**Stack teknis:** Node.js + Express.js, Prisma ORM, PostgreSQL (backend); Next.js App Router + TypeScript (frontend); JWT + RBAC (auth); Multer (upload lokal) dan library `xlsx` (parsing Excel).

# 2. Cakupan Gudang

| Tipe | Nama | Keterangan |
|---|---|---|
| Gudang Tetap 1 | Kantor Pusat Cimahi | Zona A, B, C, D (seed data) |
| Gudang Tetap 2 | Rancamanyar | Zona A, B, C, D (seed data) |
| Gudang Dadakan | Dibuat per kebutuhan project | Transit sementara di dekat site klien; 1 zona default (lihat 6.7) |

Struktur zona Gudang Tetap bersifat fixed (tipe Indoor/Outdoor, kode A/B/C/D) dan tidak ada UI untuk edit layout.

# 3. Peran, Hak Akses, dan RBAC

## 3.1 Empat Peran Sistem

| Peran | Kode role | Ringkasan |
|---|---|---|
| Admin General | `admin_general` | Seluruh modul, manajemen user, aktivasi BOQ, input laporan mitra, audit log penuh, pembuatan Gudang Dadakan |
| Supervisor | `supervisor` | Approval inbound/outbound, layout gudang, rekonsiliasi, laporan, review Stock Opname |
| Staf Gudang | `staf_gudang` | Input Surat Jalan, putaway, retrieval, konfirmasi pengiriman, permintaan BOQ |
| Auditor **[USULAN]** | `auditor` | Stock Opname / audit persediaan; akses baca BOQ & Rekonsiliasi |

## 3.2 Aturan Akses Gudang **[DITETAPKAN]**

Menggantikan konsep `gudang_ids` (plural) pada JWT v5.x.

| Role | Akses gudang |
|---|---|
| `admin_general` | Seluruh gudang |
| `supervisor` | Seluruh gudang |
| `staf_gudang` | Hanya gudang yang ditugaskan (satu gudang) |
| `auditor` **[USULAN]** | Hanya gudang yang ditugaskan untuk diaudit (bisa lebih dari satu, per assignment opname) — tidak otomatis semua gudang |

Revisi implementasi: payload JWT memuat `user_id`, `role`, dan `gudang_id` penugasan (untuk staf); pembatasan gudang dievaluasi di middleware/service berdasarkan role, bukan array `gudang_ids`.

## 3.3 Matriks Hak Akses Fitur

| Fitur | Admin | Supervisor | Staf | Auditor |
|---|---|---|---|---|
| Manajemen user & role | ✓ | ✕ | ✕ | ✕ |
| Master data | ✓ | ✓ (baca) | ✕ | ✕ |
| Buat Gudang Dadakan | ✓ | ✕ | ✕ | ✕ |
| Buat/aktivasi BOQ | ✓ | ✓ | ✕ | ✕ |
| Lihat BOQ | ✓ | ✓ | ✓ | ✓ (baca) |
| Ajukan Permintaan BOQ | ✕ | ✕ | ✓ | ✕ |
| Tinjau Permintaan BOQ | ✓ | ✓ | ✕ | ✕ |
| Input Surat Jalan | ✓ | ✓ | ✓ | ✕ |
| Approve/reject Surat Jalan | ✓ | ✓ | ✕ | ✕ |
| Putaway / retrieval | ✕ | ✕ | ✓ | ✕ |
| Input Laporan Mitra (manual/Excel) | ✓ | ✓* | ✕ | ✕ |
| Lihat Rekonsiliasi | ✓ | ✓ | ✕ | ✓ (baca) |
| Kecukupan Area | ✓ | ✓ | ✕ | ✕ |
| Buat jadwal Stock Opname | ✓ | ✓ | ✕ | ✕ |
| Mulai, input, submit Stock Opname | ✕ | ✕ | ✕ | ✓ |
| Review/approve Stock Opname | ✓ | ✓ | ✕ | ✕ |
| Stock Adjustment | ✓ | ✓ | ✕ | ✕ |
| Lihat Audit Trail | ✓ (penuh) | ✓ | Terbatas (milik sendiri) | ✓ (gudang penugasan) |
| Export laporan opname | ✓ | ✓ | Terbatas | ✓ |

*Keputusan pembaruan menyebut Admin sebagai penginput laporan mitra; v5.2 memberi Supervisor akses upload. Konfirmasi peran Supervisor diperlukan.

## 3.4 Keamanan Akun — `must_change_password` **[DITETAPKAN]**

- Field `must_change_password` (boolean) pada `user_account`.
- Admin membuat user baru dengan **password awal (sementara)**; `must_change_password = true`.
- Pada **login pertama**, user wajib mengganti password sebelum dapat memakai fitur lain.
- Setelah password berhasil diganti: `must_change_password = false`, akses normal dipulihkan, kejadian dicatat di audit log.
- Pembatasan akses saat belum ganti password **[VALIDASI]**: sesi dibatasi hanya ke halaman/endpoint ganti password dan logout, jika diterapkan di middleware.

# 4. Model Data

## 4.1 Relasi Utama

```
project
 └── tiket_material (Tiket Gudang, kode_tiket unik)
      ├── boq (boq_number unik) ── boq_item
      │     └── surat_jalan ── surat_jalan_item ── surat_jalan_item_foto
      │                    └── surat_jalan_approval_log
      └── laporan_mitra  (riwayat laporan; sumber MOS Mitra & Used)
gudang ── zona_gudang ── stok_gudang ── stok_ledger (jurnal append-only)
barang ── kategori, satuan
user_account ── personil (1:1 opsional)
permintaan_boq, notification, audit_log
reconciliation_upload_log ── reconciliation_upload_detail
[USULAN] stock_opname ── stock_opname_detail ── audit_finding
         stock_opname ── stock_opname_assignment (opsional, tim auditor)
```

## 4.2 `tiket_material` (Tiket Gudang)

| Field | Tipe | Keterangan |
|---|---|---|
| `tiket_id` | BigInt PK | ID unik |
| `kode_tiket` | String unique | Identifier bisnis |
| `project_id` | BigInt FK, nullable | Relasi project |
| `area` | String | Area/lokasi proyek |
| `mos` | Decimal | Nilai MOS hasil refresh dari `laporan_mitra` aktif |
| `used` | Decimal | Nilai Used hasil refresh dari `laporan_mitra` aktif |
| `created_by` | BigInt FK | User pembuat |

`mos` dan `used` adalah nilai turunan (cache) dan **bukan** tempat penulisan langsung. Field `used_terpasang` **[DEPRECATED]**.

## 4.3 `boq`

`boq_number` (auto, format `BOQ-{YYYY}-{NNNN}`), `tiket_id` (FK), `status` (`draft | aktif | selesai | ditolak`), `source` (`top_down` = Email PO | `bottom_up` = permintaan staf), `external_verification_status` (`menunggu | terverifikasi | tidak_berlaku`), `catatan`, `reference_file`. Item BOQ: `barang_id`, `qty_rencana`, `satuan_id`, `gudang_tujuan_id`.

## 4.4 `surat_jalan` — Field Tambahan **[DITETAPKAN]**

Field berikut sudah dipakai sistem dan dipertahankan sebagai bagian desain resmi:

| Field | Fungsi |
|---|---|
| `tipe_pengirim` | Membedakan asal pengiriman inbound (misalnya gudang internal vs pihak luar) sehingga form menampilkan input yang sesuai |
| `supplier_id` | Referensi ke master supplier bila pengirim adalah supplier |
| `tujuan_tipe` | Membedakan tujuan outbound: gudang atau lapangan/project |
| `titik_lapangan_id` | Referensi titik lapangan tujuan bila `tujuan_tipe` = lapangan |
| `alamat_lapangan` | Alamat/lokasi lapangan (teks) sebagai pelengkap tujuan |
| `pic_pemohon_nama` | PIC/pemohon yang tampil pada detail dan dokumen SJ |
| `pengirim_or_vendor` | Teks bebas nama pengirim/vendor eksternal (tetap dipakai) |

Nilai enum `tipe_pengirim` dan `tujuan_tipe` mengikuti schema Prisma aktual dan dicantumkan pada data dictionary final setelah dicek ke kode **[VALIDASI]**.

## 4.5 `laporan_mitra` **[DITETAPKAN]**

Entity baru yang menyimpan setiap laporan mitra sebagai record dengan histori tersendiri.

| Field | Keterangan |
|---|---|
| `laporan_id` | PK |
| `tiket_id`, `kode_tiket` | Relasi ke `tiket_material` |
| `project_id` | Relasi project |
| `jenis_laporan` | Enum: `manual`, `excel`, `migrasi_sistem` |
| `tanggal_laporan` | Tanggal laporan dari mitra |
| `pic_mitra` | Nama PIC mitra pelapor |
| `nama_barang` | Barang yang dilaporkan |
| `mos` | Qty material on site menurut laporan |
| `used` | Qty terpakai/terpasang menurut laporan |
| `catatan`, `kondisi` | Keterangan dan kondisi barang |
| `uploaded_by`, `uploaded_at` | Penginput dan waktu input |
| `is_aktif` | Penanda laporan yang dipakai dalam perhitungan |

| `jenis_laporan` | Sumber |
|---|---|
| `manual` | Input langsung melalui sistem |
| `excel` | Upload file Excel |
| `migrasi_sistem` | Data hasil migrasi sistem (data lama), diberi label "belum dikonfirmasi mitra" di UI |

## 4.6 Audit & Notifikasi

- **`audit_log`**: `entity_type`, `entity_id`, `aksi`, `actor_id`, `data_sebelum`, `data_sesudah`, `created_at`, ditambah `kode_tiket` (bila relevan) agar pencarian per tiket menyeluruh. Append-only untuk semua peran.
- **`notification`**: `title`, `message`, `link`, `type`, `is_read`, `created_at`, penerima berbasis role/user.
- **`stok_ledger`**: jurnal mutasi append-only (`jenis_mutasi`, `qty`, `saldo_setelah`).

# 5. Aturan Bisnis Inti

## 5.1 Definisi Metrik Rekonsiliasi

| Metrik | Definisi | Sumber |
|---|---|---|
| **BOQ Plan** | Rencana hardware | `boq_item.qty_rencana` |
| **MOS Sistem** | Jumlah material yang secara sistem tercatat **telah didistribusikan ke lapangan/project** berdasarkan transaksi yang relevan (bukan lagi dari approval inbound) | Transaksi distribusi (Surat Jalan outbound ke lapangan). **[VALIDASI]** formula & query final dicek ke kode |
| **MOS Mitra** | Material on site menurut laporan mitra | `laporan_mitra` aktif |
| **Used** | Hardware yang benar-benar terpakai/terpasang di lapangan menurut **laporan aktual** | `laporan_mitra` aktif (*reported actual usage*) |
| **Selisih** | `MOS Sistem − MOS Mitra`; baris `≠ 0` ditandai perlu perhatian | Dihitung saat query |
| **Remains** | **Belum dikunci** — lihat 5.4 | — |

Pembedaan konsep: **stok gudang** = barang berada di gudang; **MOS pada rekonsiliasi** = barang sudah didistribusikan ke lapangan/project.

## 5.2 Mekanisme Used **[DITETAPKAN]**

```
Barang didistribusikan ke project
  → dipakai / belum dipakai di lapangan
  → Staf/PIC lapangan melapor
  → Admin menerima laporan
  → Admin input via "Input Laporan Mitra" (Manual atau Upload Excel)
  → tersimpan sebagai laporan_mitra → Used diperbarui
```

Used **tidak** bertambah otomatis karena outbound/distribusi. `approveOutbound()` tidak boleh menambah `tiket_material.used`; sisa logika lama dibersihkan. Konsekuensi: klasifikasi jenis transaksi "Pemindahan vs Instalasi" dari v5.2 §14.4 tidak lagi diperlukan untuk menghitung Used.

## 5.3 Alur Laporan Mitra: *Append*, Bukan *Overwrite* **[DITETAPKAN]**

```
Input Laporan Mitra → simpan record laporan_mitra
  → laporan menjadi sumber data rekonsiliasi
  → sistem menghitung ulang MOS & Used dari laporan aktif
  → tiket_material.mos / used di-refresh
```

Laporan memiliki histori sendiri (siapa, kapan, apa) dan tidak menimpa nilai lama secara langsung. Metode agregasi (penjumlahan seluruh laporan aktif per tiket–barang vs nilai terbaru) dikonfirmasi pada finalisasi teknis **[VALIDASI]**.

## 5.4 Formula Remains **[VALIDASI — Belum Dikunci]**

| Konsep | Rumus |
|---|---|
| Konsep bisnis | `Remains = MOS − Used` (contoh: 100 − 30 = 70) |
| Implementasi ditemukan | `Remains = MOS Sistem − (BOQ + Additional)` |
| Dokumentasi v5.0 | `Remains = tiket_material.mos − (used + boq_plan)` |

Formula implementasi tidak boleh diganti hanya berdasarkan namanya. Wajib dilakukan **tracing** `MOS Sistem → BOQ → Additional → Used → Remains` (asal data di database dan pemakaiannya di UI/API) untuk menjawab:

1. Apakah `BOQ + Additional` sebenarnya merepresentasikan Used, atau kebutuhan/perencanaan material?
2. Apakah formula hanya berlaku pada reconciliation tertentu, bukan sisa material di project?
3. Apakah "MOS Sistem" di kode berbeda definisi dari MOS konsep bisnis?

Remains dikunci pada versi berikutnya setelah tracing selesai.

## 5.5 Pencegahan Double Report **[DITETAPKAN]**

- Aturan bisnis: **maksimal satu laporan per hari** untuk satu kombinasi laporan.
- Kunci deteksi duplikat: **`kode_tiket` + `tanggal_laporan` + `pic_mitra`**.
- Validasi dilakukan **sebelum submit** (tahap preview), karena laporan yang sudah di-submit tidak dapat dicabut/dihapus secara bebas.
- Koreksi laporan yang salah dilakukan lewat mekanisme non-aktifkan (`is_aktif`) yang tercatat di audit log, bukan hapus fisik.

## 5.6 Format & Template Excel Laporan Mitra **[DITETAPKAN]**

Lima kolom wajib, urutan tetap:

| Kolom | Tipe | Validasi upload |
|---|---|---|
| Kode Tiket | Teks | Harus ada di `tiket_material` |
| Nama Barang | Teks | Harus cocok dengan barang pada BOQ tiket |
| MOS | Angka ≥ 0 | Numerik, tidak boleh negatif |
| Used | Angka ≥ 0 | Numerik, tidak boleh negatif |
| Kondisi | Teks | Nilai kondisi valid |

Berkas .xlsx/.xls maksimum 10 MB; hasil upload ditampilkan sebagai preview (baris berhasil dan gagal beserta alasan) sebelum konfirmasi. **Template Excel sudah aktif** dan dapat diunduh dari UI (dipindahkan dari roadmap ke fitur aktif).

# 6. Rancangan Fungsional per Modul

## 6.1 Master Data **[AKTUAL]**

Barang, Kategori, Satuan, Gudang, Zona, Personil (termasuk *Gudang Penugasan*), Kendaraan, Project/Cluster, Supplier, Customer. Semua memakai soft delete (`is_aktif = false`); baris nonaktif tidak muncul di dropdown baru namun tetap tampil pada riwayat.

## 6.2 Tiket Gudang & BOQ **[AKTUAL]**

1. User membuat BOQ → sistem membuat/menemukan `tiket_material` berdasarkan `kode_tiket`.
2. BOQ mulai `draft`; Admin/Supervisor mengaktifkan → `aktif` (dapat dijadikan referensi Surat Jalan).
3. BOQ `aktif`/`selesai` tidak dapat diubah atau dihapus; soft delete hanya untuk `draft` (menjadi `ditolak`).

**Permintaan BOQ (bottom-up):** Staf mengajukan penambahan item; Supervisor `ditinjau → disetujui/ditolak`. Persetujuan tidak otomatis mengubah BOQ (penambahan tetap manual oleh Admin/Supervisor).

## 6.3 Surat Jalan dan Workflow Status **[VALIDASI]**

Delapan status dipertahankan sebagai acuan:

| Status | Berlaku | Kapan muncul (usulan dokumentasi) | Pelaku | Catatan validasi |
|---|---|---|---|---|
| `draft_diajukan` | Outbound (dan/atau inbound) | Saat Surat Jalan dibuat dan diajukan; **status resmi** yang menggantikan istilah lama "diajukan" | Staf/Supervisor | Cek apakah juga dipakai inbound |
| `menunggu_verifikasi` | Inbound | Setelah Staf membuat inbound; masuk antrian verifikasi | Sistem (otomatis) | — |
| `ready_putaway` | Inbound | Setelah Supervisor approve; barang di-ACC, belum ditempatkan | Supervisor | — |
| `disetujui` | Outbound | Setelah Supervisor approve outbound; juga status siap kirim setelah retrieval | Supervisor | Pastikan retrieval tidak mengubah status |
| `sedang_dikirim` | Outbound | Setelah update status distribusi | Supervisor/Staf | — |
| `diterima_didistribusikan` | Inbound & Outbound | Inbound: setelah putaway. Outbound: setelah konfirmasi diterima | Staf/Supervisor | Memicu MOS Sistem pada konteks distribusi |
| `ditolak` | Inbound & Outbound | Saat reject (catatan wajib) | Supervisor | — |
| `digenerate` | Belum jelas | Diduga terkait proses generate dokumen Surat Jalan | ? | **Cek apakah benar dipakai atau sisa teknis** |

Alur inbound dan outbound:

```
INBOUND   menunggu_verifikasi ─approve→ ready_putaway ─putaway→ diterima_didistribusikan
                        └──────reject→ ditolak
OUTBOUND  draft_diajukan ─approve→ disetujui ─kirim→ sedang_dikirim ─konfirmasi→ diterima_didistribusikan
                        └──────reject→ ditolak
```

**Pertanyaan validasi wajib:** apakah seluruh status benar-benar dipakai; kondisi kemunculan tiap status; siapa yang boleh mengubah; adakah status sisa teknis; apakah inbound/outbound memakai seluruh atau sebagian status. Hasilnya diisikan ke tabel di atas pada versi berikutnya.

**Kondisi barang:** `baik`, `rusak_ringan`, `rusak_berat`, `tidak_sesuai_spek`, `doa`. Foto dapat diunggah per item.

**Revisi UI dari tim perusahaan [USULAN]:**

- Label "Approval" diganti "Form Persetujuan" (Inbound dan Outbound); tanpa perubahan endpoint/enum.
- Halaman review menampilkan dua tampilan berdampingan: PDF asli dari pengirim vs preview Surat Jalan yang digenerate sistem (prasyarat: fitur auto-generate PDF diselesaikan).
- Foto barang menjadi gate wajib sebelum Surat Jalan Outbound dapat dibuat (perlu desain staging foto pra-SJ).

## 6.4 Stok, Putaway, dan Retrieval **[AKTUAL]**

- `stok_gudang` menyimpan posisi stok per (gudang, zona, barang, kondisi, project).
- Approve inbound: stok bertambah pada `zona_id = null` (staging). Putaway: stok staging berkurang, stok zona bertambah, keduanya tercatat di `stok_ledger`.
- Approve outbound: stok zona berkurang (`deductOutboundStock`) dan alokasi BOQ berkurang (`reduceBoqAllocation`). Retrieval mengurangi stok per zona sesuai item.
- **Perubahan v6.0:** approve inbound **tidak lagi** menambah `tiket_material.mos`; approve outbound **tidak lagi** menambah `tiket_material.used`.

## 6.5 Layout Gudang, Zona, dan Kecukupan Area **[AKTUAL]**

- Layout Gudang: daftar zona, tipe, status kecukupan, total qty, jumlah jenis barang. Denah dinamis 0–4+ zona dengan badge "Dadakan".
- Detail Zona (drill-down): `GET /api/warehouses/:id/zones/:zona_id/stock` dengan pagination dan pencarian.
- Kecukupan Area: status `CUKUP | MENDEKATI_PENUH | TIDAK_CUKUP` dihitung otomatis dari **sisa kapasitas absolut** (`kapasitas_maksimum` per zona/gudang), dengan override manual per-zona yang mencatat penilai dan tanggal. Ambang default disimpan di konfigurasi (`capacity.config.js`).

## 6.6 Rekonsiliasi Inventory dan Laporan Mitra **[DITETAPKAN]**

Halaman Rekonsiliasi Inventory berdiri sendiri: kolom Project, Kode Tiket, Kode Perangkat, MOS Sistem, MOS Mitra, Used, Selisih (dan Remains setelah dikunci).

**Input Laporan Mitra** (dilakukan Admin mewakili laporan yang diterima dari lapangan):

- **Manual:** form dengan Kode Tiket, Nama Barang, Tanggal Laporan, PIC Mitra, MOS, Used, Kondisi, Catatan.
- **Upload Excel:** template 5 kolom (5.6) → preview → cek duplikat (5.5) → konfirmasi → simpan ke `laporan_mitra` → refresh MOS & Used → catat di `reconciliation_upload_log/detail` dan `audit_log`.
- **Riwayat laporan:** daftar `laporan_mitra` dengan filter tiket, PIC, tanggal, jenis laporan.

Endpoint `PUT /api/reconciliation/:tiketId/mos-mitra` **DIPENSIUNKAN**. Update MOS kini hanya lewat `laporan_mitra` (upload Excel atau input manual). **[DITETAPKAN]**

## 6.7 Gudang Dadakan **[DITETAPKAN — menyesuaikan implementasi terbaru]**

Definisi: lokasi penyimpanan/transit sementara untuk project yang jauh dari Gudang Tetap dengan instalasi bertahap.

| Aspek | Keputusan |
|---|---|
| Tipe gudang | Enum `tetap`/`dadakan` pada gudang (default `tetap`) |
| Struktur zona | 1 zona default ("Area Utama") — bukan 4 zona A–D. *Menggantikan v5.2 §14.3 yang menyebut tanpa zona (`zona_id = null` permanen)* |
| Project | `project_id` **wajib** |
| Pembuat | Hanya Admin General (bukan Supervisor) |
| Ubah tipe gudang | Read-only bila sudah ada stok atau lebih dari 1 zona terisi |
| Penonaktifan | Diblokir selama masih ada stok tersisa (qty > 0); berlaku untuk kedua tipe gudang. Stok harus dipindahkan ke gudang lain lebih dulu |
| Tampilan | Badge/label "Dadakan" di list dan dropdown gudang |
| Putaway | Zona otomatis dipilih dan dropdown zona disembunyikan untuk gudang 1 zona |

Isu terbuka: mekanisme retur sisa stok ke Gudang Tetap (jenis transaksi "Pemindahan" terbalik atau "Retur") dan akses pencatatan oleh personil lapangan **[USULAN]**.

## 6.8 Notifikasi **[DITETAPKAN]**

Notifikasi in-app berbasis role (`type`: `approval` dan dapat dikembangkan). Dokumentasi PRD wajib mencakup: trigger, penerima, kondisi pengiriman, dan jenis aktivitas. Matriks berikut adalah kerangka; nilai penerima diverifikasi ke kode:

| Trigger | Penerima | Status |
|---|---|---|
| Staf membuat Surat Jalan inbound | Role `supervisor` | AKTUAL |
| Surat Jalan outbound diajukan | Role `supervisor` | DITETAPKAN — verifikasi kode |
| Inbound ditolak | Pembuat Surat Jalan (staf) | DITETAPKAN — verifikasi penerima |
| Outbound ditolak | Pembuat Surat Jalan (staf/supervisor) | DITETAPKAN — verifikasi penerima |
| Stock Opname ditugaskan / selesai / dikembalikan / selisih ditemukan | Lihat 7.7 | USULAN |

Bila penerima berbeda per jenis transaksi, ditulis eksplisit pada tabel final.

## 6.9 Audit Trail Komprehensif **[DITETAPKAN]**

**Prinsip:** setiap user wajib tercatat saat beraktivitas — tidak hanya Admin.

Aktivitas yang dicatat: login/logout; membuat, mengubah, menghapus/menonaktifkan data; approval dan rejection; upload dan input laporan mitra; proses inbound/outbound; perubahan yang memengaruhi stok/rekonsiliasi; seluruh aktivitas Auditor dan Stock Adjustment.

Dapat ditelusuri berdasarkan: user/actor, waktu, aktivitas/aksi, entity terkait, dan informasi pendukung.

- Filter Audit Log: rentang tanggal, `userId`, `entity_type`, `aksi`, dan **`kode_tiket` yang menelusuri seluruh entity terkait tiket** (BOQ, inbound, outbound, rekonsiliasi, laporan mitra), bukan hanya `entity_type = reconciliation`.
- `update_mos_mitra` **[DIPENSIUNKAN]**: tidak lagi ditulis oleh sistem; nilai enum dipertahankan sementara agar baris audit_log lama tetap valid. Sisa kode/enum/service dibersihkan.
- Log tidak dapat diubah/dihapus oleh peran apa pun; koreksi lewat transaksi baru.

## 6.10 Manajemen Pengguna **[AKTUAL + DITETAPKAN]**

CRUD user (nama, email, role, gudang penugasan, relasi personil); status Aktif/Nonaktif (soft delete); reset password via email; `must_change_password` (3.4); role `auditor` ditambahkan pada enum dan middleware.

# 7. Modul Stock Opname & Audit Persediaan **[USULAN]**

Modul baru yang berdiri sendiri, bukan sekadar tambahan role. Auditor melakukan pencatatan stok fisik dan membandingkannya dengan stok sistem, tanpa hak mengubah stok.

## 7.1 Prinsip

- Auditor **tidak** boleh langsung mengubah stok sistem. Selisih menjadi dasar penyesuaian oleh pihak berwenang.
- Selisih **tidak** otomatis mengubah stok (`stok sistem = stok aktual` dilarang). Jalur wajib: temuan → review → investigasi → approval → Stock Adjustment → `stok_ledger`.

## 7.2 Alur Bisnis

```
Admin/Supervisor: buat jadwal → pilih gudang → tentukan auditor → status "dijadwalkan"
Auditor: Mulai Opname → sistem ambil SNAPSHOT stok sistem
Auditor: cek fisik → input stok aktual, kondisi, catatan
Sistem: hitung selisih → Auditor beri catatan/temuan → Submit
Admin/Supervisor: review ─┬→ disetujui → finalisasi → Laporan Audit → (bila perlu) Stock Adjustment
                          └→ perlu koreksi → kembali ke Auditor
```

**Snapshot stok:** saat opname dimulai, stok sistem dikunci sebagai referensi sehingga audit tidak berubah walau operasional gudang berjalan. Mode *Freeze Warehouse* (inbound/outbound/mutasi/adjustment dibatasi) dijadikan opsi pengembangan lanjutan.

**Formula:** `Selisih = Stok Aktual − Stok Sistem` (0 = sesuai; < 0 = kekurangan; > 0 = kelebihan). Ini menggantikan usulan v5.2 §15.1.7 yang memakai `sistem − fisik`.

## 7.3 Status Stock Opname

`draft → dijadwalkan → sedang_berjalan → menunggu_review → disetujui → selesai`; cabang `menunggu_review → perlu_koreksi → sedang_berjalan`; serta `dibatalkan`.

## 7.4 Entity Baru

**`stock_opname`** (header): `opname_id`, `kode_opname`, `gudang_id`, `auditor_id`, `tanggal_jadwal`, `tanggal_mulai`, `tanggal_selesai`, `status`, `catatan`, `created_by`, `created_at`, `updated_at`.

**`stock_opname_detail`**: `detail_id`, `opname_id`, `item_id`, `zona_id`, (`rack_id`/`bin_id` hanya bila struktur lokasi tersebut kembali dipakai), `stok_sistem`, `stok_aktual`, `selisih`, `kondisi`, `catatan`, `checked_at`. Yang diisi Auditor: stok aktual, kondisi, catatan; sisanya otomatis.

**`stock_opname_assignment`** (opsional, bila opname dikerjakan tim): `assignment_id`, `opname_id`, `auditor_id`, `assigned_by`, `assigned_at`, `status`. Jika satu opname hanya satu auditor, `auditor_id` pada header sudah cukup.

**`audit_finding`** (Fase 3): `finding_id`, `opname_id`, `detail_id`, `jenis_temuan` (`stock_difference`, `damaged_item`, `wrong_location`, `missing_item`, `incorrect_label`, `other`), `severity` (`low`, `medium`, `high`, `critical`), `deskripsi`, `status`, `resolved_by`, `resolved_at`, `created_at`.

> Catatan penyesuaian: struktur rak/bin sudah dihapus dari schema aktif, sehingga lokasi opname mengacu ke **zona**. Kolom rak/bin pada rancangan awal hanya dipakai jika struktur tersebut diadopsi kembali.

## 7.5 Stock Adjustment & Ledger

Hanya Admin General atau Supervisor. Tipe: Penambahan/Pengurangan, dengan alasan yang merujuk kode opname (contoh: "Hasil Stock Opname #SO-2026-001"). Sistem mencatat `before_qty`, `adjustment`, `after_qty` ke `stok_ledger` (jenis mutasi baru `adjustment_opname`) dan `audit_log`.

## 7.6 Halaman Web Auditor

Sidebar: Dashboard; Stock Opname (Jadwal Opname, Opname Aktif, Riwayat Opname, Temuan Audit); Laporan (Laporan Stock Opname); Audit Trail; BOQ (baca); Rekonsiliasi (baca); Profil.

Auditor tidak melihat: konfigurasi sistem, user management, approval BOQ, pengaturan gudang, input laporan mitra, master permission.

- **Dashboard:** kartu Jadwal Opname, Opname Aktif, Temuan Selisih (jumlah item), Opname Selesai Bulan Ini; daftar Jadwal Audit Terdekat.
- **Halaman Opname:** tabel Barang, Lokasi/Zona, Stok Sistem, Stok Aktual, Selisih, Kondisi, Catatan.
- **Mode Blind Count (Fase 3):** stok sistem disembunyikan hingga submit; opsi Normal vs Blind Count dipilih saat memulai.

## 7.7 Notifikasi dan Audit Trail Opname

| Penerima | Pesan |
|---|---|
| Auditor | Ditugaskan Stock Opname (gudang, tanggal); atau dikembalikan untuk koreksi |
| Supervisor | Opname selesai dan menunggu review |
| Admin | Ditemukan N item selisih pada opname SO-… |

Aksi audit: `create_opname`, `start_opname`, `update_opname_item`, `submit_opname`, `create_finding`, `update_finding`, `approve_opname`, `reject_opname`, `stock_adjustment`.

## 7.8 Laporan & Ekspor

Laporan ringkasan: kode opname, gudang, tanggal, auditor, jumlah item, item sesuai, item selisih, total selisih, temuan, status. Detail: item, sistem, aktual, selisih, kondisi, temuan. Ekspor Excel dan PDF. Format akhir laporan untuk Admin/tim internal dikonfirmasi dengan perusahaan.

## 7.9 API (Usulan)

| Method | Path | Fungsi |
|---|---|---|
| POST | `/api/opname` | Buat jadwal opname (Admin/Supervisor) |
| GET | `/api/opname` | Daftar opname (sesuai assignment) |
| POST | `/api/opname/:id/start` | Mulai opname + snapshot stok |
| PUT | `/api/opname/:id/items/:detailId` | Input stok aktual/kondisi/catatan |
| POST | `/api/opname/:id/submit` | Submit hasil |
| PUT | `/api/opname/:id/review` | Approve / kembalikan |
| POST | `/api/stock-adjustments` | Buat penyesuaian dari hasil opname |
| GET | `/api/opname/:id/export` | Ekspor Excel/PDF |

# 8. Rancangan Halaman Web per Peran

**Admin General (`/dashboard`):** Dashboard; Master Data; BOQ & Tiket Gudang; Layout Gudang; Laporan & Audit; Rekonsiliasi Inventory + Input Laporan Mitra; Manajemen User; Kecukupan Area; Stock Opname (buat jadwal, review, adjustment).

**Supervisor (`/dashboard/supervisor`):** Dashboard; Form Persetujuan Inbound; Form Persetujuan Outbound; Status Distribusi; BOQ; Delivery Surat Jalan; Operasional; Warehouse; Rekonsiliasi; Review Stock Opname dan Stock Adjustment.

**Staf Gudang:** Dashboard staf (scoped ke gudang penugasan); Input Surat Jalan Inbound/Outbound; Putaway; Retrieval; Permintaan BOQ; Riwayat pengajuan sendiri.

**Auditor (`/dashboard/opname`):** lihat 7.6, ditambah akses baca `/dashboard/boq` dan `/dashboard/reconciliation`.

Bahasa UI: seluruhnya Bahasa Indonesia.

# 9. API Endpoint Utama (Ringkasan)

| Area | Endpoint |
|---|---|
| Auth | `/api/auth` (login, refresh, forgot/reset, ganti password awal) |
| Surat Jalan | `/api/surat-jalan` (CRUD, `staff-inbound`, `verification-queue`, `outbound-queue`, `approve/reject-inbound|outbound`, `putaway`, `retrieve`, `delivery-status`, `confirm-distributed`, foto item) |
| Gudang & Zona | `/api/warehouses`, `/api/warehouses/:id/layout`, `/api/warehouses/:id/zones/:zona_id/stock`, `/api/zones` |
| BOQ | `/api/boq`, `/api/permintaan-boq` |
| Rekonsiliasi | `GET /api/reconciliation`; upload/confirm/log di `/api/reports/reconciliation/*`; endpoint `laporan_mitra` (CRUD/list, template Excel) |
| Laporan | `/api/reports/stock-history`, `/api/reports/audit-logs`, `/api/reports/hardware-reconciliation*`, `/api/reports/zone-utilization*` |
| Lainnya | `/api/notifications`, `/api/dashboard`, `/api/upload`, `/api/opname` (usulan) |

# 10. Keamanan dan Non-Fungsional

- JWT + middleware role di setiap endpoint sensitif; akses gudang berbasis role/assignment (3.2).
- Audit log append-only untuk semua peran, termasuk Admin General.
- Soft delete untuk seluruh entitas master; log dan ledger tidak dihapus.
- Upload: foto via `/api/upload`; Excel maksimum 10 MB (.xlsx/.xls).
- Validasi duplikat laporan dilakukan sebelum submit (5.5).
- Auditor tidak memiliki hak tulis pada stok maupun data master.

# 11. Daftar Legacy / Deprecated (Pembersihan)

| Item | Tindakan |
|---|---|
| Action `update_mos_mitra` (enum, service, referensi) | Dipensiunkan; tidak lagi ditulis oleh sistem. Nilai enum dipertahankan sementara agar baris audit_log lama tetap valid. |
| Field `tiket_material.used_terpasang` | Legacy; bersihkan lewat migration setelah dipastikan tanpa dependency |
| Field `reconciliation_upload_detail.used_terpasang` | Hapus; controller yang mencoba menulisnya dibersihkan (schema memang tidak memiliki field ini) |
| Penambahan `used` otomatis di `approveOutbound()` | Hapus |
| Penambahan `mos` otomatis saat approve inbound | Hapus dari alur rekonsiliasi |
| Endpoint overwrite `PUT /api/reconciliation/:tiketId/mos-mitra` | Putuskan: pensiun atau arahkan ke `laporan_mitra` |
| Konsep `gudang_ids` plural | Ganti aturan berbasis role/assignment |
| Klasifikasi Pemindahan vs Instalasi untuk Used (v5.2 §14.4) | Dicabut |

# 12. Open Decisions dan Validasi

| # | Topik | Yang perlu diputuskan/dicek |
|---|---|---|
| 1 | Formula Remains | Tracing MOS Sistem → BOQ → Additional → Used → Remains, lalu kunci definisi |
| 2 | Definisi teknis MOS Sistem | Sumber transaksi dan formula final dari kode |
| 3 | 8 status Surat Jalan | Validasi pemakaian, pelaku, dan state transition; khususnya `digenerate` dan `draft_diajukan` |
| 4 | Agregasi `laporan_mitra` | Akumulasi seluruh laporan aktif vs nilai terbaru per barang |
| 5 | Endpoint `mos-mitra` manual | DIPENSIUNKAN; update MOS kini hanya lewat `laporan_mitra` |
| 6 | Penerima notifikasi reject | Verifikasi per jenis transaksi |
| 7 | Pembatasan akses saat password awal belum diganti | Terapkan di middleware atau tidak |
| 8 | Peran input Laporan Mitra | Admin saja atau juga Supervisor |
| 9 | Gudang Dadakan | Retur sisa stok; akses pencatatan personil lapangan |
| 10 | Foto pra-SJ outbound | Struktur staging foto sebelum SJ dibuat |
| 11 | Dual-view PDF | Penyelesaian auto-generate PDF Surat Jalan |
| 12 | Auditor: cakupan gudang | Konfirmasi assignment per gudang (bukan semua gudang) |
| 13 | Stock Opname: hasil selisih | Konfirmasi bahwa selisih hanya laporan dan adjustment lewat approval |
| 14 | Format laporan opname | Halaman dashboard, ekspor, atau notifikasi |

# 13. Roadmap dan Fase Implementasi

**Prioritas Tinggi — Penyelarasan implementasi**

1. Endpoint `PUT /api/reconciliation/:tiketId/mos-mitra` sudah dipensiunkan; update MOS kini hanya lewat `laporan_mitra`. Aksi `update_mos_mitra` tidak lagi ditulis oleh sistem, nilai enum dipertahankan sementara.
2. Implementasi `laporan_mitra` (ERD, schema, service, UI manual/Excel, template, deteksi duplikat).
3. Aturan akses gudang berbasis role dan `must_change_password`.
4. Perluasan filter `kode_tiket` di Audit Log dan pencatatan aktivitas seluruh user.
5. Validasi 8 status Surat Jalan dan dokumentasi state transition.
6. Tracing dan penguncian formula Remains.
7. Notifikasi outbound/reject sesuai dokumentasi.

**Modul Auditor (bertahap)**

| Fase | Cakupan |
|---|---|
| 1 — Core Auditor | Role Auditor, RBAC, assignment gudang, Stock Opname + detail, input stok aktual, perhitungan selisih, submit, audit trail |
| 2 — Review & Adjustment | Review Supervisor, approval/return, Stock Adjustment, integrasi `stok_ledger`, notifikasi |
| 3 — Advanced Audit | Audit Finding & severity, Blind Count, ekspor Excel/PDF, dashboard analitik |
| 4 — Optimasi | Scan barcode/QR, mobile-friendly, offline mode, recurring opname, random sampling |

**Prioritas Menengah/Lanjut:** ekspor laporan CSV/Excel dari UI; notifikasi email; dashboard statistik lebih kaya; auto-generate PDF Surat Jalan dan dual-view review; rename "Form Persetujuan"; foto wajib pra-SJ; parsing Excel format bebas; master data vendor eksternal.

# 14. Lampiran — Alur Sistem Ringkas

```
INBOUND    Staf input SJ → menunggu_verifikasi → (notif SPV) → SPV approve → ready_putaway
           → Staf putaway ke zona → diterima_didistribusikan     (stok gudang bertambah)

OUTBOUND   Staf/SPV input SJ → draft_diajukan → SPV approve → disetujui → retrieval
           → sedang_dikirim → diterima_didistribusikan            (stok gudang berkurang;
                                                                   distribusi ke lapangan → MOS Sistem)

LAPORAN    Mitra lapor ke Admin → Admin input (Manual/Excel) → cek duplikat → simpan laporan_mitra
MITRA      → refresh MOS Mitra & Used → tabel Rekonsiliasi: Selisih = MOS Sistem − MOS Mitra

OPNAME     Jadwal → Auditor mulai (snapshot) → input aktual → selisih → submit → review
           → disetujui → laporan audit → (opsional) Stock Adjustment → stok_ledger + audit_log

SEMUA AKTIVITAS USER ───────────────────────────────────────────────→ AUDIT TRAIL
```

*Dokumen ini adalah PRD v6.0 hasil konsolidasi. Butir bertanda [USULAN] dan [VALIDASI] belum diverifikasi terhadap kode dan wajib dikonfirmasi sebelum masuk sprint development.*
