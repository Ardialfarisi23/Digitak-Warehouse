# PRODUCT REQUIREMENT DOCUMENT

### Sistem Manajemen Gudang Internal Perangkat IT & Infrastruktur

_PT Metanouva Informatika (Digitak Studio)_

**Versi Dokumen Sebelumnya:** 4.5 (Standardisasi Istilah Tiket Gudang/BOQ, Kejelasan Sumber Data Project, Restrukturisasi Halaman Laporan-Audit & Rekonsiliasi Inventory Mitra, Klarifikasi Semantik Hapus, & Fitur Detail Zona) | 15 Agustus 2026

**Versi Dokumen:** 5.0 — Rekonsiliasi PRD dengan Implementasi Aktual Sistem

**Tanggal:** 4 September 2026

**Status:** Living Document — Mencerminkan Status Implementasi Aktual

---

## 0. Tentang Versi Ini

PRD v5.0 disusun ulang secara menyeluruh untuk **mencerminkan kondisi sistem yang sudah dibangun**, bukan hanya rencana desain. Setiap fitur yang terdokumentasi di sini telah diverifikasi terhadap kode aktual di repository (`backend/src/modules/` dan `frontend/app/dashboard/`).

> [!IMPORTANT]
> Dokumen ini adalah **sumber kebenaran tunggal** mulai versi ini. PRD v4.5 dan sebelumnya berlaku sebagai dokumen historis. Bila ada konflik antara v4.x dan v5.0, dokumen ini yang berlaku.

### 0.1 Ringkasan Perubahan v5.0 (Rekonsiliasi PRD ↔ Implementasi)

| # | Area | Status v4.5 (Rencana) | Status v5.0 (Aktual Implementasi) |
|---|---|---|---|
| 1 | Istilah entitas tiket | Distandardisasi ke "Tiket Gudang" | **Terimplementasi.** DB model: `tiket_material`, field: `kode_tiket`. Istilah UI: "Tiket Gudang / Kode Tiket" |
| 2 | Relasi Tiket Gudang ↔ BOQ | Tiket = header, BOQ = detail (1:1) | **Terimplementasi.** `boq` berelasi ke `tiket_material` via `tiket_id`. BOQ punya `boq_number` otomatis (format: `BOQ-{YYYY}-{NNNN}`) |
| 3 | Status BOQ | Draft → Aktif → Selesai / Ditolak | **Terimplementasi.** Enum: `draft`, `aktif`, `selesai`, `ditolak`. Validasi: BOQ aktif/selesai tidak dapat diubah/dihapus |
| 4 | Sumber BOQ (source) | Email PO / Supervisor Request | **Terimplementasi.** Enum DB: `top_down` (Email PO), `bottom_up` (Supervisor Request) |
| 5 | Alur Surat Jalan Inbound | Staf input → Supervisor verifikasi → Putaway | **Terimplementasi** dengan 5 status: `menunggu_verifikasi` → `ready_putaway` → `diterima_didistribusikan` (+ `ditolak`) |
| 6 | Alur Surat Jalan Outbound | Staf input → Supervisor approval → Pengiriman → Konfirmasi | **Terimplementasi** dengan 5 status: `diajukan` → `disetujui` → `sedang_dikirim` → `diterima_didistribusikan` (+ `ditolak`) |
| 7 | Putaway ke Zona | Staf melakukan putaway per item ke zona | **Terimplementasi.** Stok generic (zona_id=null) berkurang, stok zona bertambah, dicatat di `stok_ledger` |
| 8 | Retrieval dari Zona | Staf mengambil stok dari zona untuk outbound | **Terimplementasi.** Stok per zona dikurangi sesuai item retrieval |
| 9 | Detail Zona (drill-down) | Rencana: klik zona → snapshot stok | **Terimplementasi.** Endpoint: `GET /api/warehouses/:id/zones/:zona_id/stock` dengan pagination & search |
| 10 | Layout Gudang + Kecukupan Area | Zona A/B/C/D, status kecukupan manual | **Terimplementasi.** `zona_gudang` dengan `status_kecukupan`, `dinilai_oleh`, `dinilai_pada` |
| 11 | Laporan & Audit — 2 Tab | Rencana: Audit Log + Riwayat Stok | **Terimplementasi.** Endpoint: `GET /api/reports/stock-history` & `GET /api/reports/audit-logs` |
| 12 | Rekonsiliasi Inventory | Rencana: upload Compile Excel mitra | **Terimplementasi** penuh: upload Excel → preview → konfirmasi → simpan MOS & Used ke `tiket_material`, dicatat di `reconciliation_upload_log` |
| 13 | Permintaan BOQ (bottom-up) | Belum ada di v4.5 | **Fitur baru terimplementasi.** Modul `permintaan-boq`: Staf mengajukan, Supervisor meninjau/menyetujui/menolak |
| 14 | Notifikasi | Belum terdokumentasi | **Terimplementasi.** Modul `notifications`: notifikasi per peran (role-based), type: `approval`, link ke halaman terkait |
| 15 | Formula Remains | Remains = MOS − (BOQ Plan + Additional) | **Implementasi aktual:** Remains = `tiket_material.mos` − (`tiket_material.used` + `boq_plan`) |
| 16 | Upload rekonsiliasi — kolom Used | Open Decision: proxy otomatis vs manual | **Diputuskan & terimplementasi:** kolom `Used` diisi dari upload Excel mitra (manual), tersimpan di `tiket_material.used` |
| 17 | Soft delete | Direncanakan untuk semua entitas master | **Terimplementasi** via `is_aktif` / `deleted_at` sesuai entitas. BOQ: `softDelete` → status `ditolak`; User: status `Nonaktif` |

---

## 1. Ringkasan Eksekutif

Sistem Manajemen Gudang Internal Digitak Studio adalah aplikasi web full-stack yang mengelola siklus hidup perangkat IT & infrastruktur dari penerimaan (inbound) hingga pengiriman ke site (outbound), mencakup perencanaan (BOQ/Tiket Gudang), eksekusi (Surat Jalan), penempatan fisik (Putaway/Zona), dan rekonsiliasi dengan laporan mitra pelaksana.

**Stack Teknis Aktual:**
- **Backend:** Node.js + Express.js, Prisma ORM, PostgreSQL
- **Frontend:** Next.js (App Router), TypeScript/TSX
- **Auth:** JWT-based, RBAC 3 peran
- **Upload file:** Multer (storage lokal), parsing Excel via `xlsx` library

**Pernyataan Tujuan Produk** _(tidak berubah)_: _"Menjadi sistem manajemen gudang yang cukup dalam untuk menggantikan pencatatan manual sepenuhnya, namun cukup sederhana untuk dipakai tanpa tim IT eksternal dan tanpa pelatihan panjang."_

---

## 2. Cakupan Gudang

| Tipe | Nama | Keterangan |
|---|---|---|
| Gudang Tetap 1 | Kantor Pusat Cimahi | Zona A, B, C, D (seed data) |
| Gudang Tetap 2 | Rancamanyar | Zona A, B, C, D (seed data) |
| Gudang Dinamis | Gudang Dadakan | Dibuat per kebutuhan saat instalasi site klien |

Struktur zona: `zona_gudang` per gudang, masing-masing bertipe Indoor atau Outdoor dengan kode A/B/C/D. Layout bersifat fixed — tidak ada UI untuk edit layout.

---

## 3. Model Data Utama (Implementasi Aktual)

### 3.1 Entitas Inti & Relasi

```
project
  └── tiket_material (Tiket Gudang)   kode_tiket [unique]
        └── boq                        boq_number [unique, auto-gen]
              └── boq_item
              └── surat_jalan          (via boq_id)
                    └── surat_jalan_item
                          └── surat_jalan_item_foto
                          └── stok_ledger (jurnal mutasi stok)
                    └── surat_jalan_approval_log

gudang
  └── zona_gudang
        └── stok_gudang               (posisi stok saat ini per barang+zona+kondisi+project)

barang (Master Perangkat)
  └── kategori
  └── satuan (default)

personil
user_account  ──── personil (1:1 optional)

permintaanBoq  (Permintaan BOQ bottom-up dari Staf)
reconciliation_upload_log
reconciliation_upload_detail
audit_log
notification
```

### 3.2 Field Kunci `tiket_material` (Tiket Gudang)

| Field | Tipe | Keterangan |
|---|---|---|
| `tiket_id` | BigInt PK | ID unik |
| `kode_tiket` | String unique | Kode Tiket (identifier bisnis) |
| `project_id` | BigInt FK | Relasi ke `project` (nullable) |
| `area` | String | Area/lokasi proyek |
| `mos` | Decimal | Material on Site — diisi dari: (a) otomatis saat Supervisor approve inbound, atau (b) upload Excel rekonsiliasi |
| `used` | Decimal | Used — diisi dari upload Excel rekonsiliasi mitra |
| `created_by` | BigInt FK | User pembuat |

### 3.3 Status Surat Jalan

**Inbound:**
```
menunggu_verifikasi → [Supervisor approve] → ready_putaway → [Staf putaway] → diterima_didistribusikan
                    → [Supervisor reject] → ditolak
```

**Outbound:**
```
diajukan → [Supervisor approve] → disetujui → [Staf retrieval + kirim] → sedang_dikirim → diterima_didistribusikan
         → [Supervisor reject] → ditolak
```

> [!NOTE]
> Status `ready_putaway` adalah status perantara khusus inbound setelah Supervisor menyetujui. Barang di-ACC tapi belum ditempatkan ke zona. Putaway oleh Staf mengubah status ke `diterima_didistribusikan`.

### 3.4 Stok & Jurnal (`stok_gudang` + `stok_ledger`)

- `stok_gudang`: posisi stok **saat ini** per kombinasi (gudang, zona, barang, kondisi, project)
- Saat inbound di-approve: stok ditambah ke `stok_gudang` dengan `zona_id = null` (stok generic/staging)
- Saat putaway: stok generic dikurangi, stok zona (zona_id = nilai) ditambah — keduanya dicatat di `stok_ledger`
- Saat outbound di-approve: `deductOutboundStock` mengurangi stok zona + `reduceBoqAllocation` mengurangi alokasi BOQ
- `stok_ledger`: log append-only, field: `jenis_mutasi` (in/out), `qty`, `saldo_setelah`

---

## 4. Modul Backend (Implementasi)

| Modul | Path | Fungsi Utama |
|---|---|---|
| `auth` | `/api/auth` | Login, refresh token, forgot/reset password |
| `users` | `/api/users` | CRUD user, manajemen peran |
| `profile` | `/api/profile` | Profil user terlogin |
| `barang` (item) | `/api/items` | Master perangkat (barang), kategori |
| `kategori` (category) | `/api/categories` | Master kategori barang |
| `satuan` (unit) | `/api/units` | Master satuan pengukuran |
| `supplier` | `/api/suppliers` | Master supplier |
| `customer` | `/api/customers` | Master customer |
| `personil` (personnel) | `/api/personnel` | Master personil lapangan |
| `kendaraan` (vehicle) | `/api/vehicles` | Master kendaraan |
| `projects` | `/api/projects` | Master project/cluster |
| `warehouse` | `/api/warehouses` | CRUD gudang, layout zona, snapshot stok zona |
| `zone` | `/api/zones` | CRUD zona, update kecukupan area |
| `aisle` | `/api/aisles` | Sub-zona/lorong (fitur lanjutan) |
| `boq` | `/api/boq` | CRUD BOQ + Tiket Gudang, aktivasi status, export |
| `permintaan-boq` | `/api/permintaan-boq` | Permintaan BOQ bottom-up dari Staf |
| `surat-jalan` | `/api/surat-jalan` | CRUD Surat Jalan inbound/outbound, approval, putaway, retrieval, delivery |
| `reconciliation` | `/api/reconciliation` | Inventory MOS per Tiket, update MOS mitra manual |
| `reports` | `/api/reports` | Riwayat stok, audit log, rekonsiliasi hardware, utilisasi zona, upload Excel rekonsiliasi |
| `dashboard` | `/api/dashboard` | Statistik ringkasan untuk halaman utama |
| `notifications` | `/api/notifications` | Notifikasi in-app per peran |
| `upload` | `/api/upload` | Upload file umum (foto item, dll) |

---

## 5. Peran & Aktor

Tiga peran internal, tidak ada akses untuk pihak eksternal/klien:

| Peran | Singkatan | Akses Utama |
|---|---|---|
| Admin General | AG | Seluruh modul, manajemen user, aktivasi BOQ, audit log penuh |
| Supervisor | SPV | Dashboard supervisor, approval inbound/outbound, layout gudang, rekonsiliasi, laporan (terbatas gudang yang ditugaskan) |
| Staf Gudang | STF | Input Surat Jalan inbound, putaway, retrieval, konfirmasi pengiriman, permintaan BOQ |

### 5.1 Halaman Frontend per Peran

**Admin General / Shared Dashboard (`/dashboard`):**
- Halaman utama dashboard dengan statistik ringkasan
- Master Data: Barang, Kategori, Satuan, Gudang, Zona, Personil, Kendaraan, Project, Supplier, Customer
- BOQ & Tiket Gudang (`/dashboard/boq`)
- Layout Gudang (`/dashboard/warehouse`)
- Laporan & Audit (`/dashboard/reports`)
- Rekonsiliasi Inventory (`/dashboard/reconciliation`)
- Manajemen User (`/dashboard/users`)
- Kecukupan Area (`/dashboard/kecukupan-area`)

**Supervisor (`/dashboard/supervisor`):**
- Dashboard Supervisor (`/dashboard/supervisor`)
- Approval Inbound (`/dashboard/supervisor/approval/inbound`)
- Approval Outbound (`/dashboard/supervisor/approval/outbound`)
- Status Distribusi (`/dashboard/supervisor/approval/distribution`)
- BOQ Supervisor (`/dashboard/supervisor/boq`)
- Delivery Surat Jalan (`/dashboard/supervisor/delivery`)
- Operasional (`/dashboard/supervisor/operasional`)
- Warehouse Supervisor (`/dashboard/supervisor/warehousespv`)
- Rekonsiliasi (akses read + upload mitra)

**Staf Gudang:**
- Input Surat Jalan Inbound
- Putaway (via halaman operasional)
- Retrieval
- Permintaan BOQ (`/dashboard/supervisor/boq` — sub-fitur)

---

## 6. Ruang Lingkup Fungsional (Status Aktual)

### 6.1 Master Data ✅ Terimplementasi

- **Barang (item):** kode perangkat, nama, kategori, satuan default, status aktif
- **Kategori:** nama kategori, soft delete
- **Satuan:** kode satuan, nama, soft delete
- **Gudang:** nama, lokasi, status aktif, zona terkait
- **Zona:** kode (A/B/C/D), tipe (indoor/outdoor), status kecukupan, data penilai
- **Personil:** nama, jabatan, hubungan ke user account
- **Kendaraan:** plat nomor, jenis, status
- **Project/Cluster:** nama, area, status aktif
- **Supplier & Customer:** data kontak, status aktif

> [!NOTE]
> **Keputusan Final:** Master Data Vendor eksternal (Open Decision v4.5) **belum terimplementasi**. Field "Sumber Pengiriman" pada Surat Jalan inbound menggunakan field teks bebas (`pengirim_or_vendor`) — sesuai Opsi A pada v4.5. Ini bersifat final untuk MVP.

### 6.2 Tiket Gudang & BOQ ✅ Terimplementasi

**Alur pembuatan:**
1. User membuat BOQ baru → sistem otomatis membuat/menemukan `tiket_material` berdasarkan `kode_tiket`
2. BOQ dimulai dengan status `draft`
3. Admin General/Supervisor mengaktifkan BOQ → status `aktif`
4. BOQ aktif dapat digunakan sebagai referensi Surat Jalan

**Field BOQ:**
- `boq_number` — auto-generated (format: `BOQ-2026-0001`)
- `tiket_id` — relasi ke Tiket Gudang (FK)
- `status` — `draft` | `aktif` | `selesai` | `ditolak`
- `source` — `top_down` (dari email PO) | `bottom_up` (dari permintaan staf)
- `external_verification_status` — `menunggu` | `terverifikasi` | `tidak_berlaku`
- `catatan` — catatan bebas
- `reference_file` — URL file referensi (PO/email PDF)

**BOQ Item:**
- `barang_id`, `qty_rencana`, `satuan_id`, `gudang_tujuan_id`

**Validasi:**
- BOQ `aktif` atau `selesai` tidak dapat diedit atau dihapus
- Soft delete BOQ hanya untuk status `draft`

### 6.3 Permintaan BOQ (Bottom-Up) ✅ Terimplementasi (Fitur Baru)

Modul tambahan yang belum ada di PRD v4.5:

- **Staf Gudang** mengajukan permintaan penambahan item BOQ untuk project tertentu
- **Supervisor** meninjau (`ditinjau`) → menyetujui (`disetujui`) atau menolak (`ditolak`)
- Setiap permintaan mencatat: project, barang, qty usulan, alasan, tiket terkait (opsional), personil pengaju, personil peninjau

> [!IMPORTANT]
> Permintaan BOQ yang disetujui **tidak otomatis** mengubah BOQ di sistem — proses penambahan BOQ tetap manual oleh Admin General/Supervisor. Fitur ini berfungsi sebagai mekanisme permintaan terstruktur.

### 6.4 Surat Jalan Inbound ✅ Terimplementasi

**Alur lengkap:**

```
1. Staf membuat Surat Jalan inbound
   → status: menunggu_verifikasi
   → notifikasi dikirim ke role "supervisor"

2. Supervisor melihat antrian di halaman Approval Inbound
   → dapat melihat detail: nomor SJ, pengirim, gudang tujuan, kategori, total unit, ada fisik rusak?, selisih PO?
   → APPROVE: approveInbound() → stok generic ditambah, status: ready_putaway
   → REJECT: rejectInbound() → status: ditolak, catatan wajib

3. Staf melakukan Putaway (dari halaman Operasional)
   → memilih zona per item
   → putaway(): stok generic → stok zona (keduanya tercatat di stok_ledger)
   → status: diterima_didistribusikan
```

**Kondisi barang yang dicatat:** `baik`, `rusak_ringan`, `rusak_berat`, `tidak_sesuai_spek`, `doa`

**Foto item:** dapat diunggah per item Surat Jalan (`surat_jalan_item_foto`)

**MOS update saat approve inbound:**
- Total qty dari items inbound yang di-approve ditambahkan ke `tiket_material.mos` (jika SJ terhubung ke BOQ dengan tiket)

### 6.5 Surat Jalan Outbound ✅ Terimplementasi

**Alur lengkap:**

```
1. Staf/Supervisor membuat Surat Jalan outbound
   → status: diajukan

2. Supervisor approve di halaman Approval Outbound
   → approveOutbound(): stok zona dikurangi (deductOutboundStock), alokasi BOQ dikurangi (reduceBoqAllocation)
   → used di tiket_material ditambah sebesar total qty
   → status: disetujui
   → REJECT: rejectOutbound() → status: ditolak

3. Staf melakukan Retrieval (ambil barang dari zona)
   → retrieve(): stok zona dikurangi, dicatat di stok_ledger
   → status kembali ke: disetujui (siap kirim)

4. Update status distribusi (Supervisor/Staf):
   → updateDeliveryStatus():
      - disetujui → sedang_dikirim (+ estimasi_tiba, catatan_distribusi)
      - sedang_dikirim → diterima_didistribusikan

5. Konfirmasi diterima:
   → confirmDistributed() → status: diterima_didistribusikan
```

### 6.6 Layout Gudang & Zona ✅ Terimplementasi

- Halaman Layout Gudang menampilkan daftar zona per gudang
- Setiap zona menampilkan: kode zona, tipe, status kecukupan, total qty stok, jumlah jenis barang
- **Detail Zona (drill-down):** klik zona → snapshot stok per Kode Perangkat di zona tersebut
  - Endpoint: `GET /api/warehouses/:id/zones/:zona_id/stock`
  - Fitur: pagination, search (kode/nama barang)
  - Return: kode perangkat, nama barang, kategori, satuan, kondisi, qty, kode/nama zona
- **Kecukupan Area:** diinput manual oleh Supervisor (`CUKUP` / `MENDEKATI_PENUH` / `TIDAK_CUKUP`), dicatat dengan nama penilai dan tanggal

### 6.7 Laporan & Audit ✅ Terimplementasi

**Tab 1 — Riwayat Stok (`GET /api/reports/stock-history`):**

Filter tersedia: search (nama/kode barang, nomor SJ, kode tiket), projectId, warehouseId, zonaId, kategoriId, type (inbound/outbound), status, rentang tanggal, pagination

Return: data mutasi stok dari `stok_ledger` + `surat_jalan_item` + `surat_jalan`

**Tab 2 — Audit Log (`GET /api/reports/audit-logs`):**

Filter: rentang tanggal, userId, entity_type (boq, surat_jalan, tiket_material, dll), aksi, pagination

Return: `audit_log` dengan data_sebelum/data_sesudah (append-only, tidak dapat diubah/dihapus)

**Laporan Tambahan:**
- `GET /api/reports/hardware-reconciliation` — rekonsiliasi hardware per project
- `GET /api/reports/hardware-reconciliation-per-tiket` — rekonsiliasi per Tiket Gudang
- `GET /api/reports/hardware-reconciliation-detailed` — detail lengkap
- `GET /api/reports/zone-utilization` — utilisasi zona saat ini
- `GET /api/reports/zone-utilization-history` — riwayat utilisasi zona

### 6.8 Rekonsiliasi Inventory ✅ Terimplementasi

**Halaman Rekonsiliasi Inventory** berdiri sendiri sebagai halaman terpisah:

**Tabel Utama (`GET /api/reconciliation`):**
- Kolom: Project, Kode Tiket, Kode Perangkat, MOS (Sistem), MOS (Laporan Mitra), Used, Selisih
- Filter: projectId, gudang (dari akses Supervisor)
- Selisih = MOS Sistem − MOS Laporan Mitra; baris dengan selisih ≠ 0 ditandai perlu perhatian

**Alur Upload Compile Excel Mitra:**

```
1. Upload file Excel (.xlsx/.xls, max 10MB)
   POST /api/reports/reconciliation/upload
   → sistem parsing: kolom wajib: "Kode Tiket", "MOS", "Used"
   → return: preview (berhasil) + failed (baris gagal + alasan)

2. Review preview di UI

3. Konfirmasi simpan
   POST /api/reports/reconciliation/confirm
   → untuk setiap tiket di preview: update tiket_material.mos & tiket_material.used
   → dicatat di reconciliation_upload_log (filename, uploaded_by, total_rows, success_rows, failed_rows)
   → dicatat di reconciliation_upload_detail (per baris: kode_tiket, mos, used, status, reason)
   → dicatat di audit_log (entity_type: "reconciliation", aksi: "update")
```

**Riwayat Upload (`GET /api/reports/reconciliation/logs`):**
- Filter: search, actorId, rentang tanggal, pagination
- Tampil: filename, uploaded_by, tanggal upload, total/success/failed rows

> [!NOTE]
> **Keputusan Final mengenai sumber "Used":** Nilai `Used` diisi dari upload Excel mitra (manual), bukan proxy otomatis dari status Surat Jalan. Ini adalah keputusan implementasi final yang mengakhiri Open Decision dari v4.5.

### 6.9 Notifikasi ✅ Terimplementasi

- Notifikasi in-app per peran (`role`-based)
- Type: `approval` (dan dapat dikembangkan)
- Field: `title`, `message`, `link` (URL halaman terkait), `is_read`, `created_at`
- Trigger saat ini: Staf membuat Surat Jalan inbound → notifikasi ke role `supervisor`

### 6.10 Manajemen Pengguna ✅ Terimplementasi

- CRUD user: nama, email, password, role, gudang yang ditugaskan, hubungan ke data personil
- Status akun: `Aktif` / `Nonaktif` (soft delete — tidak menghapus data user dari DB)
- Reset password: via email (forgot password flow)
- Audit trail: setiap aksi dicatat di `audit_log`

---

## 7. Keamanan & Prinsip Data

### 7.1 RBAC

- JWT token dengan payload: `user_id`, `role`, `gudang_ids` (untuk Supervisor)
- Middleware validasi role di setiap endpoint sensitif
- Supervisor hanya dapat mengakses data gudang yang ditugaskan

### 7.2 Audit Log (Append-Only)

- Setiap transaksi penting mencatat entri ke `audit_log`
- Field: `entity_type`, `entity_id`, `aksi`, `actor_id`, `data_sebelum`, `data_sesudah`, `created_at`
- **Tidak ada mekanisme edit atau hapus** entri audit log — berlaku untuk semua peran termasuk Admin General
- Koreksi dilakukan via transaksi baru yang merujuk ke entri lama

### 7.3 Soft Delete

Semua entitas master menggunakan soft delete (bukan hard delete):
- Barang, Kategori, Satuan, Gudang, Personil, Kendaraan, Project: via `is_aktif = false`
- BOQ: via status `ditolak` atau field `deleted_at`
- User Account: via status `Nonaktif`
- Baris nonaktif tidak muncul di dropdown/input baru, namun tetap tampil di riwayat transaksi historis

### 7.4 Upload File

- **Foto item Surat Jalan:** upload via endpoint `/api/upload`, disimpan di server, URL disimpan di `surat_jalan_item_foto`
- **Excel rekonsiliasi:** upload via Multer ke `backend/src/uploads/reconciliation/`, max 10MB, format `.xlsx`/`.xls`

---

## 8. Formula Rekonsiliasi (Implementasi Aktual)

| Metrik | Definisi | Sumber Data |
|---|---|---|
| **BOQ Plan** | Jumlah rencana hardware dari BOQ | `boq_item.qty_rencana` |
| **MOS (Sistem)** | Material on Site — total yang telah masuk gudang | `tiket_material.mos` — diakumulasi dari approve inbound |
| **MOS (Laporan Mitra)** | MOS menurut laporan mitra pelaksana | `tiket_material.mos` — di-overwrite dari upload Excel mitra |
| **Used** | Hardware yang sudah terpasang/terpakai menurut mitra | `tiket_material.used` — diisi dari upload Excel mitra |
| **Selisih** | MOS Sistem − MOS Laporan Mitra | Kalkulasi saat query rekonsiliasi |
| **Remains** | Sisa hardware yang belum terpasang | `MOS − Used` (efektif dari data tiket) |

> [!WARNING]
> MOS di `tiket_material` bersifat **overwrite** saat upload Excel mitra (bukan append). Nilai MOS yang ditampilkan di halaman rekonsiliasi mengacu ke nilai terkini di field tersebut. Tim perlu memastikan upload dilakukan secara konsisten agar nilai tidak stale.

---

## 9. Fitur yang Belum Terimplementasi / Dalam Roadmap

| Fitur | Status | Catatan |
|---|---|---|
| Master Data Vendor Eksternal | ❌ Belum | Open Decision v4.5 → diputuskan pakai field teks bebas (Opsi A) untuk MVP |
| "+ Buat Project Baru" inline di form BOQ | ❌ Belum | Rencana v4.5 (7.10.1), belum ada di implementasi frontend |
| Export laporan (CSV/Excel) | ⚠️ Parsial | Endpoint `exportBoqs` ada di backend, UI belum sepenuhnya terintegrasi |
| Laporan lanjutan & ekspor data kustom | ❌ Belum | Didorong ke fase berikutnya |
| Grid Editor drag-and-drop layout | ❌ Dicoret | Dihapus permanen dari roadmap |
| Parsing Excel format bebas (arbitrary) | ❌ Belum | Hanya template standar (`Kode Tiket`, `MOS`, `Used`) yang didukung saat ini |
| Notifikasi untuk event selain inbound | ⚠️ Parsial | Hanya inbound saat ini; outbound rejection belum memiliki notifikasi |
| Auto-generate PDF (GRN, Packing List) | ⚠️ Parsial | Endpoint ada, integrasi UI belum penuh |

---

## 10. API Endpoint Utama (Ringkasan)

### Surat Jalan

| Method | Path | Fungsi |
|---|---|---|
| POST | `/api/surat-jalan` | Buat Surat Jalan (inbound/outbound) |
| POST | `/api/surat-jalan/staff-inbound` | Buat inbound oleh Staf (langsung ke menunggu_verifikasi) |
| GET | `/api/surat-jalan/:id` | Detail Surat Jalan |
| GET | `/api/surat-jalan/inbound` | List inbound (untuk approval Supervisor) |
| GET | `/api/surat-jalan/verification-queue` | Antrian verifikasi inbound |
| GET | `/api/surat-jalan/outbound-queue` | Antrian outbound |
| GET | `/api/surat-jalan/outbound-approval` | Daftar outbound untuk approval |
| GET | `/api/surat-jalan/outbound-delivery` | Daftar outbound untuk delivery |
| GET | `/api/surat-jalan/staff-history` | Riwayat SJ milik staf terlogin |
| POST | `/api/surat-jalan/:id/receive` | Staf mencatat penerimaan inbound |
| PUT | `/api/surat-jalan/:id/approve-inbound` | Supervisor approve inbound |
| PUT | `/api/surat-jalan/:id/reject-inbound` | Supervisor reject inbound |
| PUT | `/api/surat-jalan/:id/approve-outbound` | Supervisor approve outbound |
| PUT | `/api/surat-jalan/:id/reject-outbound` | Supervisor reject outbound |
| POST | `/api/surat-jalan/:id/putaway` | Staf lakukan putaway ke zona |
| POST | `/api/surat-jalan/:id/retrieve` | Staf lakukan retrieval dari zona |
| PUT | `/api/surat-jalan/:id/delivery-status` | Update status distribusi |
| POST | `/api/surat-jalan/:id/confirm-distributed` | Konfirmasi outbound diterima |
| POST | `/api/surat-jalan/:sjId/items/:itemId/foto` | Upload foto item |
| DELETE | `/api/surat-jalan/:sjId/items/:itemId/foto/:fotoId` | Hapus foto item |

### Gudang & Zona

| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/warehouses/:id/layout` | Layout gudang + statistik per zona |
| GET | `/api/warehouses/:id/zones/:zona_id/stock` | Snapshot stok per zona (Detail Zona) |

### Laporan & Rekonsiliasi

| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/reports/stock-history` | Riwayat stok (Tab Riwayat Stok) |
| GET | `/api/reports/audit-logs` | Audit log (Tab Audit Log) |
| GET | `/api/reports/hardware-reconciliation` | Rekonsiliasi hardware per project |
| GET | `/api/reports/zone-utilization` | Utilisasi zona saat ini |
| POST | `/api/reports/reconciliation/upload` | Upload + preview Excel rekonsiliasi |
| POST | `/api/reports/reconciliation/confirm` | Konfirmasi simpan hasil upload |
| GET | `/api/reports/reconciliation/logs` | Riwayat upload rekonsiliasi |
| GET | `/api/reconciliation` | Tabel inventory rekonsiliasi (MOS sistem vs mitra) |
| PUT | `/api/reconciliation/:tiketId/mos-mitra` | Update MOS mitra secara manual (per tiket) |

---

## 11. Risiko Aktual & Mitigasi

| Risiko | Status | Mitigasi |
|---|---|---|
| MOS di tiket di-overwrite saat upload Excel (bukan append) | **Aktif** | Tampilkan tanggal upload terakhir; riwayat upload tersimpan di `reconciliation_upload_log` sebagai jejak |
| Stok generic (zona_id=null) menumpuk jika putaway tidak dilakukan setelah approve inbound | **Aktif** | UI harus menampilkan antrian ready_putaway dengan jelas; pertimbangkan notifikasi ke Staf |
| Format Excel rekonsiliasi dari mitra tidak sesuai template | **Aktif** | Validasi saat upload dengan pesan error per baris + ringkasan berhasil/gagal di riwayat upload |
| Sinkronisasi MOS antara inbound otomatis dan upload mitra bisa menimbulkan kebingungan | **Perlu Klarifikasi** | Dokumentasikan untuk user: MOS di-set dari approve inbound, bisa di-overwrite oleh upload Excel mitra |
| Notifikasi hanya untuk inbound — Supervisor mungkin tidak tahu ada outbound baru | **Aktual Gap** | Tambahkan notifikasi outbound ke backlog roadmap |

---

## 12. Roadmap Prioritas (Post-MVP)

### Prioritas Tinggi (Sprint Berikutnya)
- [ ] Notifikasi untuk approve/reject outbound
- [ ] Halaman antrian `ready_putaway` yang lebih eksplisit untuk Staf
- [ ] Inline "+ Buat Project Baru" pada form BOQ (7.10.1 dari v4.5)

### Prioritas Menengah
- [ ] Export laporan ke CSV/Excel dari UI
- [ ] Integrasi notifikasi email (bukan hanya in-app)
- [ ] Template Excel rekonsiliasi yang dapat diunduh dari UI
- [ ] Dashboard statistik lebih kaya (trend inbound/outbound, utilisasi zona over time)

### Prioritas Lanjut
- [ ] Parsing Excel rekonsiliasi format bebas/arbitrary
- [ ] Auto-generate PDF Surat Jalan (sudah ada endpoint, perlu UI)
- [ ] Master Data Vendor Eksternal (jika kebutuhan muncul post-MVP)

---

## 13. Lampiran — Alur Sistem Lengkap

### 13.1 Alur Inbound Lengkap

```
Staf → Input Surat Jalan Inbound (form: pengirim, gudang tujuan, list item+qty+kondisi+foto)
  → POST /api/surat-jalan/staff-inbound
  → Status: menunggu_verifikasi
  → Notifikasi → Supervisor

Supervisor → Halaman Approval Inbound → Review detail
  → APPROVE → PUT /api/surat-jalan/:id/approve-inbound
    → stok_gudang += qty (zona_id=null, stok generic)
    → tiket_material.mos += total_qty (jika ada BOQ terhubung)
    → Status: ready_putaway
  → REJECT → PUT /api/surat-jalan/:id/reject-inbound (catatan wajib)
    → Status: ditolak

Staf → Halaman Operasional → Putaway
  → POST /api/surat-jalan/:id/putaway (items: [{item_id, qty_ditempatkan, zona_id}])
  → stok_gudang generic -= qty → stok_gudang zona += qty
  → stok_ledger: out (generic) + in (zona)
  → Status: diterima_didistribusikan
```

### 13.2 Alur Outbound Lengkap

```
Staf/Supervisor → Input Surat Jalan Outbound
  → POST /api/surat-jalan (tipe: outbound)
  → Status: diajukan

Supervisor → Approval Outbound
  → APPROVE → PUT /api/surat-jalan/:id/approve-outbound
    → stok_gudang zona -= qty (deductOutboundStock)
    → boq alokasi dikurangi (reduceBoqAllocation)
    → tiket_material.used += total_qty
    → Status: disetujui
  → REJECT → PUT /api/surat-jalan/:id/reject-outbound
    → Status: ditolak

Staf → Retrieval (ambil barang dari rak/zona)
  → POST /api/surat-jalan/:id/retrieve (items: [{item_id, qty, zona_id}])
  → stok zona -= qty, dicatat di stok_ledger
  → Status: disetujui (siap kirim)

Update status distribusi:
  → PUT /api/surat-jalan/:id/delivery-status
  → disetujui → sedang_dikirim (+ estimasi_tiba)
  → sedang_dikirim → diterima_didistribusikan

Atau konfirmasi langsung:
  → POST /api/surat-jalan/:id/confirm-distributed
  → Status: diterima_didistribusikan
```

### 13.3 Alur Rekonsiliasi dengan Mitra

```
Mitra → Kirim Compile Excel (format: Kode Tiket | MOS | Used)

Supervisor/Admin → Halaman Rekonsiliasi → Tab Upload
  → Pilih file → POST /api/reports/reconciliation/upload
  → Preview: baris berhasil + baris gagal + alasan
  → Review di UI

  → Konfirmasi → POST /api/reports/reconciliation/confirm
  → tiket_material.mos = nilai dari Excel (overwrite)
  → tiket_material.used = nilai dari Excel (overwrite)
  → Dicatat di reconciliation_upload_log + reconciliation_upload_detail
  → Dicatat di audit_log

Tabel Rekonsiliasi diperbarui:
  → Selisih = MOS (Sistem/tiket.mos) − MOS (Laporan Mitra/tiket.mos setelah upload)
  → Baris Selisih ≠ 0 → ditandai perlu perhatian
```

---

_Dokumen ini diperbarui oleh: Antigravity IDE_  
_Terakhir diperbarui: 4 September 2026_  
_Berdasarkan inspeksi kode aktual repository: `d:\Project\digitak-warehouse`_
