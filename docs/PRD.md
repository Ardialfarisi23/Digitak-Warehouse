# PRD — Digitak Warehouse Management System

> **Versi Dokumen:** 1.0 (Reverse-engineered dari codebase)
> **Tanggal Dibuat:** 13 Oktober 2026
> **Status Proyek:** Aktif / In Development
> **Bahasa Dokumen:** Bahasa Indonesia (istilah teknis tetap dalam bahasa Inggris)

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Latar Belakang & Tujuan](#2-latar-belakang--tujuan)
3. [Target Pengguna & Persona](#3-target-pengguna--persona)
4. [Ruang Lingkup](#4-ruang-lingkup)
5. [Arsitektur Sistem](#5-arsitektur-sistem)
6. [Struktur Proyek](#6-struktur-proyek)
7. [Functional Requirements](#7-functional-requirements)
8. [Alur Pengguna (User Flow)](#8-alur-pengguna-user-flow)
9. [Halaman, Route & Komponen UI](#9-halaman-route--komponen-ui)
10. [Model Data](#10-model-data) - lihat [data-model.md](./data-model.md)
11. [Spesifikasi API](#11-spesifikasi-api) - lihat [api-spec.md](./api-spec.md)
12. [Autentikasi & Otorisasi](#12-autentikasi--otorisasi)
13. [Integrasi Pihak Ketiga](#13-integrasi-pihak-ketiga)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Konfigurasi & Environment](#15-konfigurasi--environment)
16. [Testing & Quality](#16-testing--quality)
17. [Temuan & Risiko](#17-temuan--risiko)
18. [Rekomendasi & Roadmap](#18-rekomendasi--roadmap)
19. [Lampiran](#19-lampiran)

---

## 1. Ringkasan Eksekutif

**Digitak Warehouse Management System** adalah aplikasi web internal milik Digitak Studio untuk mengelola seluruh operasional pergudangan material jaringan telekomunikasi. Sistem ini mencakup alur lengkap dari penerimaan barang (inbound), penyimpanan (putaway), pengiriman (outbound), rekonsiliasi hardware lapangan, dan pelaporan audit.

### Masalah yang Diselesaikan

| # | Masalah | Solusi Sistem |
|---|---------|---------------|
| 1 | Pencatatan stok manual yang rawan error | Ledger stok otomatis berbasis Surat Jalan |
| 2 | Tidak ada visibilitas BOQ vs realisasi distribusi | Modul BOQ dengan tracking per cluster & tiket |
| 3 | Proses approval tidak terstruktur | Workflow multi-tahap dengan audit log |
| 4 | Rekonsiliasi hardware lapangan manual | Upload rekonsiliasi via Excel + konfirmasi |
| 5 | Tidak ada kontrol akses berbasis peran | RBAC tiga level: Admin, Supervisor, Staff |

### Nilai Utama

- **Traceability penuh:** setiap mutasi stok tercatat di `stok_ledger` dan `audit_log`
- **Multi-gudang:** mendukung gudang tetap dan gudang dadakan (transit)
- **Approval workflow:** BOQ, Surat Jalan, dan Return melalui alur persetujuan berjenjang
- **Export & Laporan:** ekspor Excel dan PDF untuk rekonsiliasi, audit, dan stok

### Status Saat Ini

- Backend: **Production-ready** (Express.js + PostgreSQL + Prisma, versi 1.0.0)
- Frontend: **Aktif dikembangkan** (Next.js 16.3.0, versi 0.1.0)
- Database: Schema lengkap dengan 37 model/tabel dan 23 enum, sudah ada migrasi Prisma
- Testing: Unit test ada di beberapa modul kritis (surat-jalan, gudang-scope, dashboard)

---

## 2. Latar Belakang & Tujuan

### Tujuan Bisnis

- Meningkatkan akurasi dan efisiensi pencatatan stok material telekomunikasi
- Memberikan visibilitas real-time antara rencana BOQ dan realisasi distribusi lapangan
- Meminimalisir kehilangan material dan selisih rekonsiliasi

### Tujuan Produk

- Menyediakan satu platform terpusat untuk seluruh operasional gudang
- Mendukung multi-proyek dan multi-cluster dalam satu sistem
- Memastikan setiap transaksi material dapat ditelusuri (auditable)

### Metrik Keberhasilan [ASUMSI: tidak didefinisikan eksplisit di kode]

- Selisih rekonsiliasi stok <= 1%
- Waktu proses approval surat jalan < 24 jam
- Semua mutasi stok terlacak di ledger (100% coverage)

---

## 3. Target Pengguna & Persona

### Peran Sistem

Terdapat tiga peran yang didefinisikan di `backend/prisma/schema.prisma:894` dan dikonfirmasi di `backend/src/middlewares/role.middleware.js:4`:

| Kode Backend | Kode Frontend | Label UI |
|---|---|---|
| `admin_general` | `admin` | Admin General |
| `supervisor` | `supervisor` | Supervisor |
| `staf_gudang` | `staff` | Staf Gudang |

---

### Persona 1 - Admin General (`admin_general`)

**Kebutuhan:**
- Mengelola seluruh master data (barang, gudang, pengguna, proyek, dll.)
- Melihat laporan lengkap dan audit log
- Mengelola BOQ dan rekonsiliasi hardware
- Akses penuh ke semua fitur

**Hak Akses (berdasarkan route):**
- CRUD penuh: master data (warehouses, aisles, categories, items, personnels, projects, suppliers, units, vehicles, zones, clusters)
- Membuat & mengubah BOQ, Surat Jalan
- Melihat laporan stok, audit log, rekonsiliasi
- Manajemen pengguna (create/update/deactivate)
- Menerima export Excel/PDF

---

### Persona 2 - Supervisor (`supervisor`)

**Kebutuhan:**
- Menyetujui atau menolak Surat Jalan outbound
- Memantau utilisasi gudang dan zona
- Melihat data operasional tim
- Mengelola rekonsiliasi lapangan
- Melakukan konfirmasi distribusi barang

**Hak Akses (berdasarkan route):**
- Approval: outbound surat jalan, return transaction
- Membuat BOQ (bersama Admin)
- Memperbarui status utilisasi zona (`/api/zones/:zona_id/utilization-status`)
- Melihat antrian approval dan riwayat
- Akses rekonsiliasi dan remains note
- Upload file rekonsiliasi Excel

---

### Persona 3 - Staf Gudang (`staf_gudang`)

**Kebutuhan:**
- Menerima barang masuk (inbound)
- Melakukan putaway ke zona/rak
- Memproses picking outbound
- Mencatat transit gudang dadakan
- Melihat riwayat transaksi pribadi

**Hak Akses (berdasarkan route):**
- Membuat inbound surat jalan (`POST /api/surat-jalan/inbound/staff`)
- Menerima inbound (`POST /api/surat-jalan/:id/receive-inbound`)
- Putaway (`POST /api/surat-jalan/:id/putaway`)
- Retrieve/picking barang
- Transit tiba & lanjut (`POST /api/surat-jalan/:id/transit/tiba|lanjut`)
- Upload foto item (`POST /api/surat-jalan/:id/items/:itemId/fotos`)
- Melihat history pribadi (`GET /api/surat-jalan/staff/history`)

---

## 4. Ruang Lingkup

### In-Scope (fitur yang ada di kode)

| Modul | Keterangan |
|---|---|
| Autentikasi & Otorisasi | Login JWT, refresh token, forgot/reset password, change password |
| Master Data | Gudang, zona, aisle, kategori, barang, satuan, supplier, kendaraan, personil, proyek, cluster, titik lapangan |
| BOQ (Bill of Quantity) | CRUD BOQ, item BOQ, status workflow, verifikasi eksternal, export Excel/matrix |
| Permintaan BOQ | Pengajuan bottom-up oleh tim lapangan, review & approval |
| Surat Jalan | Inbound & outbound dengan workflow multi-status, transit gudang dadakan |
| Stok Gudang | Ledger stok otomatis, tracking per zona/kondisi/proyek |
| Putaway & Retrieval | Penempatan barang ke zona & pengambilan stok |
| Rekonsiliasi | Upload Excel laporan mitra, konfirmasi, remains note |
| Laporan & Audit | Riwayat stok, audit log, zone utilization, hardware reconciliation |
| Return Material | Pengajuan, approval, penerimaan return dari lapangan |
| Additional Adjustment | Penyesuaian stok manual by Admin/Supervisor |
| Notifikasi | Sistem notifikasi in-app per role |
| Manajemen Pengguna | CRUD user account, assignment gudang |
| Profil & Pengaturan | Update profil, ganti avatar, preferensi notifikasi |
| Dashboard | KPI summary, project summary, approval queue, warehouse assessment |
| Upload File | Upload gambar (item foto), file BOQ reference, rekonsiliasi Excel |

### Out-of-Scope (tidak ada di kode)

- Integrasi dengan sistem ERP/SAP eksternal
- Fitur mobile native (Android/iOS app)
- Manajemen pengiriman pihak ketiga (3PL integration)
- Invoice & billing
- Sistem email/notifikasi push (hanya in-app)
- Barcode/QR scanning (tidak ditemukan implementasinya)

---

## 5. Arsitektur Sistem

### Tech Stack

#### Frontend

| Komponen | Teknologi | Versi |
|---|---|---|
| Framework | Next.js (App Router) | 16.3.0 |
| Bahasa | TypeScript | ^5 |
| UI Library | Tailwind CSS | ^4 |
| Component Library | shadcn/ui | ^4.16.1 |
| State Management | React Context + SWR + TanStack Query | SWR ^2.5.1, Query ^5.101.4 |
| HTTP Client | Axios | ^1.19.0 |
| Form Handling | React Hook Form + Zod | ^7.84.0 + ^4.4.3 |
| PDF Generator | @react-pdf/renderer + react-pdf | ^4.6.0 + ^10.5.0 |
| Excel Export | ExcelJS | ^4.4.0 |
| Icon Library | Lucide React | ^1.30.0 |
| Image Crop | react-easy-crop | ^6.2.3 |
| Animasi | tw-animate-css | ^1.4.0 |

#### Backend

| Komponen | Teknologi | Versi |
|---|---|---|
| Runtime | Node.js | >=18 |
| Framework | Express.js | ^5.2.1 |
| Bahasa | JavaScript (CommonJS) | - |
| ORM | Prisma | ^6.16.3 |
| Database | PostgreSQL | >=14 |
| Database Driver | pg | ^8.22.0 |
| Autentikasi | jsonwebtoken + bcrypt | ^9.0.3 + ^6.0.0 |
| Validasi | Zod | ^4.4.3 |
| File Upload | Multer | ^2.2.0 |
| Excel Processing | ExcelJS + xlsx | ^4.4.0 + ^0.18.5 |
| Logging | Morgan | ^1.11.0 |
| Cookie | cookie-parser | ^1.4.7 |
| CORS | cors | ^2.8.6 |

### Diagram Arsitektur

```mermaid
graph TB
    subgraph Browser["Browser (Client)"]
        FE["Next.js 16.3.0\n(App Router + TypeScript)"]
    end

    subgraph Backend["Backend Server (Node.js)"]
        API["Express.js REST API\n:5000"]
        MW["Middlewares\n(Auth, Role, GudangScope, Validation, Error)"]
        MOD["Business Modules\n(28 modul)"]
    end

    subgraph Database["Database"]
        PG["PostgreSQL >=14\ndigitakwarehouse"]
        PRISMA["Prisma ORM 6.x"]
    end

    subgraph Storage["File Storage"]
        FS["Local File System\n/backend/uploads/"]
    end

    FE -->|"HTTP REST via Axios\nBearer JWT"| API
    API --> MW
    MW --> MOD
    MOD --> PRISMA
    PRISMA --> PG
    MOD -->|"Multer"| FS
    FE -->|"Static files /uploads/**"| FS
```

### Alur Data Utama

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS as Next.js Frontend
    participant Express as Express API
    participant DB as PostgreSQL

    Browser->>NextJS: Request halaman
    NextJS->>NextJS: Cek auth localStorage token
    NextJS->>Express: GET /api/auth/me dengan Bearer token
    Express->>DB: Query user_account
    DB-->>Express: User data
    Express-->>NextJS: success + data
    NextJS-->>Browser: Render halaman dengan data

    Browser->>NextJS: Aksi form submit
    NextJS->>Express: POST/PUT/PATCH endpoint
    Express->>Express: Middleware auth + role + validation
    Express->>DB: Prisma transaction
    DB-->>Express: Result
    Express-->>NextJS: Response JSON
    NextJS-->>Browser: Update UI
```

---

## 6. Struktur Proyek

```
digitak-warehouse/
├── backend/                          # REST API Server
│   ├── prisma/
│   │   ├── schema.prisma             # Schema database (1088 baris, 37 model, 23 enum)
│   │   ├── seed.js                   # Data seed awal
│   │   ├── migrations/               # File migrasi Prisma
│   │   └── seeders/                  # Data seeder tambahan
│   ├── src/
│   │   ├── app.js                    # Setup Express, CORS, routes (app.js)
│   │   ├── server.js                 # Entry point listen port
│   │   ├── config/
│   │   │   ├── env.js                # Environment variable loader
│   │   │   └── prisma.js             # Prisma client singleton
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js    # JWT verify + aktif check
│   │   │   ├── role.middleware.js    # RBAC authorization
│   │   │   ├── gudang-scope.middleware.js  # Scope akses per gudang
│   │   │   ├── validation.middleware.js    # Zod schema validation
│   │   │   ├── error.middleware.js   # Global error handler
│   │   │   └── require-password-change.middleware.js
│   │   ├── modules/                  # 28 business modules
│   │   │   ├── auth/                 # Login, logout, reset password
│   │   │   ├── boq/                  # Bill of Quantity CRUD
│   │   │   ├── cluster/              # Cluster per proyek
│   │   │   ├── surat-jalan/          # MODUL UTAMA: inbound/outbound flow
│   │   │   ├── dashboard/            # KPI & statistik
│   │   │   ├── reports/              # Laporan & audit
│   │   │   ├── reconciliation/       # Rekonsiliasi hardware
│   │   │   ├── permintaan-boq/       # Request BOQ tambahan
│   │   │   ├── return/               # Return material
│   │   │   ├── additional/           # Penyesuaian stok manual
│   │   │   ├── notifications/        # Notifikasi in-app
│   │   │   ├── settings/             # Pengaturan user & notifikasi
│   │   │   ├── users/                # Manajemen akun user
│   │   │   ├── profile/              # Profil pengguna
│   │   │   ├── upload/               # File upload handler
│   │   │   ├── warehouse/            # Master gudang
│   │   │   ├── zone/                 # Zona gudang
│   │   │   ├── aisle/                # Aisle gudang
│   │   │   ├── category/             # Kategori barang
│   │   │   ├── item/                 # Master barang
│   │   │   ├── unit/                 # Satuan barang
│   │   │   ├── supplier/             # Master supplier
│   │   │   ├── customer/             # Master customer
│   │   │   ├── personnel/            # Master personil
│   │   │   ├── vehicle/              # Master kendaraan
│   │   │   ├── projects/             # Master proyek
│   │   │   ├── titik-lapangan/       # Lokasi lapangan
│   │   │   └── capacity/             # Kapasitas gudang [belum di-mount]
│   │   ├── shared/
│   │   │   ├── errors.js             # AppError class
│   │   │   └── password.js           # bcrypt helper
│   │   └── utils/                    # Utility functions
│   ├── uploads/                      # File uploads (foto item, BOQ ref, dll.)
│   └── scripts/
│       └── dev/                      # Development scripts
│
├── frontend/                         # Next.js Web App
│   ├── app/                          # App Router pages
│   │   ├── page.tsx                  # Halaman login (redirect by role)
│   │   ├── layout.tsx                # Root layout + AuthProvider
│   │   ├── dashboard/                # Halaman Admin & Supervisor
│   │   │   ├── layout.tsx            # Sidebar + ProtectedRoute wrapper
│   │   │   ├── page.tsx              # Dashboard Admin
│   │   │   ├── boq/                  # Cluster & BOQ management
│   │   │   ├── delivery/             # Surat Jalan (Admin view)
│   │   │   ├── warehouse/            # Gudang & Layout
│   │   │   ├── reconciliation/       # Rekonsiliasi
│   │   │   ├── reports/              # Laporan & Audit
│   │   │   ├── users/                # Manajemen Pengguna
│   │   │   ├── settings/             # Pengaturan
│   │   │   └── supervisor/           # Area khusus Supervisor
│   │   │       ├── page.tsx          # Dashboard Supervisor
│   │   │       ├── approval/         # Antrian Approval
│   │   │       ├── boq/              # BOQ view Supervisor
│   │   │       ├── warehousespv/     # Utilisasi Gudang
│   │   │       ├── reconciliation/   # Rekonsiliasi Supervisor
│   │   │       └── operasional/      # Data Operasional & Tim
│   │   ├── staff/                    # Halaman Staf Gudang
│   │   │   ├── layout.tsx            # Staff layout + sidebar
│   │   │   ├── dashboard/            # Tugas Saya
│   │   │   ├── inbound/              # Penerimaan barang
│   │   │   ├── outbound/             # Surat Jalan outbound
│   │   │   ├── putaway/              # Lokasi & Rak
│   │   │   └── history/              # Riwayat transaksi
│   │   ├── master-data/              # Master Data (Admin + Supervisor)
│   │   ├── profile/                  # Profil pengguna
│   │   ├── notifications/            # Notifikasi
│   │   ├── forgot-password/          # Lupa password
│   │   └── reset-password/           # Reset password
│   ├── components/                   # Shared UI components
│   │   ├── CompactSidebar.tsx        # Sidebar navigasi utama
│   │   ├── GlobalHeader.tsx          # Header global (notifikasi, avatar)
│   │   ├── ConfirmModal.tsx          # Modal konfirmasi generik
│   │   ├── BarangPicker.tsx          # Komponen pilih barang
│   │   ├── BoqPicker.tsx             # Komponen pilih BOQ
│   │   ├── TablePagination.tsx       # Komponen paginasi tabel
│   │   ├── UserAvatar.tsx            # Avatar pengguna
│   │   ├── WarehouseLayoutMap.tsx    # Peta layout gudang
│   │   ├── PdfViewerComponent.tsx    # PDF viewer
│   │   ├── AccountDeactivatedListener.tsx  # Deteksi akun dinonaktifkan
│   │   ├── ui/                       # shadcn/ui base components
│   │   ├── staff/                    # Komponen khusus staff
│   │   ├── surat-jalan/              # Komponen surat jalan
│   │   └── reconciliation/           # Komponen rekonsiliasi
│   └── lib/
│       ├── api.ts                    # Axios instance + interceptors
│       ├── auth-context.tsx          # AuthContext + useAuth hook
│       ├── navigation.ts             # Konfigurasi navigasi per role
│       ├── protected-route.tsx       # HOC proteksi route
│       ├── permissions.ts            # Utility cek permission
│       └── exportReconciliationXlsx.ts  # Export Excel rekonsiliasi
│
└── docs/                             # Dokumentasi proyek
    ├── PRD.md                        # Dokumen ini
    ├── api-spec.md                   # Spesifikasi API lengkap
    └── data-model.md                 # Model data & ERD
```

---

## 7. Functional Requirements

### FR-001 - Autentikasi Pengguna

| Atribut | Detail |
|---|---|
| **ID** | FR-001 |
| **Nama** | Login & Session Management |
| **Deskripsi** | Pengguna login dengan email + password. Sistem mengeluarkan JWT access token (24 jam) dan refresh token (7 hari) |
| **User Story** | Sebagai karyawan, saya ingin login ke sistem agar dapat mengakses fitur sesuai peran saya |
| **Acceptance Criteria** | Login berhasil -> redirect ke dashboard sesuai role; Login gagal -> pesan error; Token expired -> auto-refresh atau redirect login |
| **Aturan Bisnis** | Email harus unik; Password di-hash dengan bcrypt; Akun non-aktif tidak bisa login; Pengguna dengan `must_change_password=true` diarahkan ke halaman ganti password |
| **File Terkait** | `backend/src/modules/auth/auth.service.js`, `frontend/lib/auth-context.tsx` |
| **Status** | Selesai |

### FR-002 - Reset Password

| Atribut | Detail |
|---|---|
| **ID** | FR-002 |
| **Nama** | Forgot & Reset Password |
| **Deskripsi** | Pengguna memasukkan email, sistem membuat token reset (expire 15 menit), menghasilkan URL reset |
| **User Story** | Sebagai pengguna, saya ingin reset password jika lupa agar bisa kembali mengakses sistem |
| **Aturan Bisnis** | Token disimpan di tabel `password_resets`, expire 15 menit; Reset URL di-generate ke frontend |
| **Catatan** | [ASUMSI: Email tidak dikirimkan secara otomatis - `forgotPassword` service hanya mengembalikan `resetUrl` tanpa memanggil email service] |
| **File Terkait** | `backend/src/modules/auth/auth.service.js:155`, `frontend/app/forgot-password/`, `frontend/app/reset-password/` |
| **Status** | Sebagian - URL reset tidak dikirim via email |

### FR-003 - Manajemen Master Data

| Atribut | Detail |
|---|---|
| **ID** | FR-003 |
| **Nama** | CRUD Master Data |
| **Deskripsi** | Admin dapat mengelola semua entitas master: gudang, zona, kategori barang, barang, satuan, supplier, kendaraan, personil, proyek, cluster, titik lapangan |
| **User Story** | Sebagai Admin, saya ingin menambah, mengedit, dan menghapus data master agar sistem selalu up-to-date |
| **Acceptance Criteria** | Setiap entitas dapat dibuat, dibaca, diperbarui; Soft-delete tersedia untuk beberapa entitas (BOQ, proyek) |
| **File Terkait** | `frontend/app/master-data/page.tsx` (124 KB), `backend/src/modules/{warehouse,zone,category,item,...}/` |
| **Status** | Selesai |

### FR-004 - Manajemen BOQ

| Atribut | Detail |
|---|---|
| **ID** | FR-004 |
| **Nama** | Bill of Quantity Management |
| **Deskripsi** | Admin/Supervisor dapat membuat, mengedit, dan mengubah status BOQ per cluster. BOQ berisi daftar barang dengan qty rencana, additional, MOS, dan used |
| **User Story** | Sebagai Admin, saya ingin membuat BOQ untuk setiap cluster agar distribusi material terencana dan terukur |
| **Acceptance Criteria** | BOQ dapat dibuat dengan status `draft`; BOQ dapat diaktifkan dengan tanggal aktivasi; BOQ dapat soft-delete dan restore |
| **Aturan Bisnis** | Status flow: `draft -> aktif -> selesai/ditolak`; `boq_source`: `top_down` atau `bottom_up`; `external_verification_status`: `menunggu/terverifikasi/tidak_berlaku` |
| **File Terkait** | `backend/src/modules/boq/`, `frontend/app/dashboard/boq/` |
| **Status** | Selesai |

### FR-005 - Surat Jalan Inbound

| Atribut | Detail |
|---|---|
| **ID** | FR-005 |
| **Nama** | Penerimaan Barang (Inbound) |
| **Deskripsi** | Staf membuat surat jalan inbound untuk mencatat barang yang masuk ke gudang dari supplier/internal. Barang diperiksa dan diterima dengan kondisi |
| **User Story** | Sebagai Staf, saya ingin mencatat barang masuk agar stok gudang selalu akurat |
| **Acceptance Criteria** | Surat jalan dibuat -> status `draft_diajukan`; Barang diterima dengan qty, kondisi, dan foto; Stok ledger diupdate otomatis |
| **Aturan Bisnis** | Kondisi barang: `baik/rusak_ringan/rusak_berat/tidak_sesuai_spek/doa`; Tipe pengirim: `internal/external` |
| **File Terkait** | `backend/src/modules/surat-jalan/surat-jalan.service.js`, `frontend/app/staff/inbound/` |
| **Status** | Selesai |

### FR-006 - Surat Jalan Outbound

| Atribut | Detail |
|---|---|
| **ID** | FR-006 |
| **Nama** | Pengiriman Barang (Outbound) |
| **Deskripsi** | Admin/Staf membuat surat jalan outbound untuk mengirim material ke lapangan atau cluster tertentu. Membutuhkan approval Supervisor sebelum dikirim |
| **User Story** | Sebagai Admin, saya ingin membuat surat jalan outbound agar pengiriman barang terdokumentasi dan disetujui Supervisor |
| **Acceptance Criteria** | SJ dibuat -> antrian approval -> Supervisor approve -> `disetujui` -> `sedang_dikirim` -> `tiba_menunggu_konfirmasi` -> `diterima_didistribusikan` |
| **Aturan Bisnis** | Kategori approval khusus untuk item kritis, melebihi BOQ, atau di luar BOQ; Picking dilakukan dari stok gudang per zona |
| **File Terkait** | `backend/src/modules/surat-jalan/surat-jalan.routes.js`, `frontend/app/dashboard/delivery/`, `frontend/app/staff/outbound/` |
| **Status** | Selesai |

### FR-007 - Putaway & Retrieval

| Atribut | Detail |
|---|---|
| **ID** | FR-007 |
| **Nama** | Putaway & Stock Retrieval |
| **Deskripsi** | Setelah barang diterima (inbound), staf melakukan putaway ke zona gudang. Saat outbound, sistem melakukan retrieval/picking dari zona |
| **User Story** | Sebagai Staf, saya ingin menempatkan barang ke zona yang tepat agar lokasi stok selalu terlacak |
| **Acceptance Criteria** | Putaway mencatat zona_id per item; Stok `stok_gudang` diupdate berdasarkan zona; Retrieval mengurangi stok dari zona |
| **File Terkait** | `backend/src/modules/surat-jalan/surat-jalan.routes.js:117-133`, `frontend/app/staff/putaway/` |
| **Status** | Selesai |

### FR-008 - Transit Gudang Dadakan

| Atribut | Detail |
|---|---|
| **ID** | FR-008 |
| **Nama** | Checkpoint Gudang Transit |
| **Deskripsi** | Surat jalan outbound dapat melewati gudang transit (tipe `dadakan`) sebelum sampai tujuan akhir. Staf mencatat tiba dan berangkat di setiap checkpoint |
| **User Story** | Sebagai Staf di gudang transit, saya ingin mencatat barang yang singgah agar perjalanan material terlacak |
| **Aturan Bisnis** | Hanya STAFF yang bisa aksi transit; Status: `sedang_dikirim -> tiba_di_transit -> sedang_dikirim -> tiba_menunggu_konfirmasi` |
| **File Terkait** | `backend/src/modules/surat-jalan/surat-jalan.routes.js:83-99`, model `surat_jalan_transit` |
| **Status** | Selesai |

### FR-009 - Rekonsiliasi Hardware

| Atribut | Detail |
|---|---|
| **ID** | FR-009 |
| **Nama** | Upload & Rekonsiliasi Laporan Mitra |
| **Deskripsi** | Admin/Supervisor upload file Excel laporan dari mitra lapangan. Sistem mem-parsing dan menyimpan data rekonsiliasi per tiket dan barang |
| **User Story** | Sebagai Admin, saya ingin mengupload laporan mitra dan melakukan rekonsiliasi agar selisih material lapangan teridentifikasi |
| **Acceptance Criteria** | Upload Excel -> parsing -> preview -> konfirmasi -> data tersimpan di `laporan_mitra`; Export rekonsiliasi tersedia dalam Excel |
| **File Terkait** | `backend/src/modules/reports/reports.routes.js:23-24`, `frontend/lib/exportReconciliationXlsx.ts`, model `laporan_mitra` |
| **Status** | Selesai |

### FR-010 - Return Material

| Atribut | Detail |
|---|---|
| **ID** | FR-010 |
| **Nama** | Return Transaction |
| **Deskripsi** | Material dari lapangan dapat dikembalikan ke gudang. Return memerlukan pengajuan, approval, dan konfirmasi penerimaan |
| **User Story** | Sebagai Admin, saya ingin mencatat return material dari lapangan agar stok gudang bertambah kembali |
| **Aturan Bisnis** | Status: `draft -> diajukan -> disetujui -> diterima_gudang / ditolak`; Return dikaitkan dengan baseline laporan mitra (`baseline_laporan_id`) |
| **File Terkait** | `backend/src/modules/return/`, model `return_transaction`, `stok_ledger` |
| **Status** | Selesai |

### FR-011 - Laporan & Audit

| Atribut | Detail |
|---|---|
| **ID** | FR-011 |
| **Nama** | Laporan Stok & Audit Log |
| **Deskripsi** | Admin dapat melihat dan mengekspor riwayat mutasi stok, log audit seluruh aksi pengguna, riwayat utilisasi zona, dan rekonsiliasi hardware |
| **User Story** | Sebagai Admin, saya ingin melihat semua aktivitas sistem dalam bentuk laporan agar dapat diaudit |
| **Acceptance Criteria** | Laporan dapat difilter; Data dapat diekspor ke Excel; Audit log mencatat semua aksi |
| **File Terkait** | `backend/src/modules/reports/`, `frontend/app/dashboard/reports/page.tsx` (106 KB) |
| **Status** | Selesai |

### FR-012 - Manajemen Pengguna

| Atribut | Detail |
|---|---|
| **ID** | FR-012 |
| **Nama** | User Management (Admin Only) |
| **Deskripsi** | Admin dapat membuat, melihat, dan mengupdate akun pengguna. Setiap user dapat di-assign ke satu atau beberapa gudang |
| **User Story** | Sebagai Admin, saya ingin mengelola akun karyawan agar hak akses terkontrol |
| **Aturan Bisnis** | User baru mendapatkan `must_change_password=true`; User dapat di-deactivate (`is_aktif=false`); User-Gudang assignment melalui tabel `user_gudang` |
| **File Terkait** | `backend/src/modules/users/`, `frontend/app/dashboard/users/` |
| **Status** | Selesai |

### FR-013 - Notifikasi In-App

| Atribut | Detail |
|---|---|
| **ID** | FR-013 |
| **Nama** | Sistem Notifikasi |
| **Deskripsi** | Sistem mengirimkan notifikasi in-app kepada pengguna atau role tertentu berdasarkan event |
| **User Story** | Sebagai pengguna, saya ingin menerima notifikasi agar tidak melewatkan aksi penting |
| **Aturan Bisnis** | Notifikasi dapat ditargetkan ke user spesifik (`user_id`) atau seluruh role (`role`); Tipe: `info/approval/warning/success/error`; Preferensi notifikasi tersimpan di `user_notification_preferences` |
| **File Terkait** | `backend/src/modules/notifications/`, model `notification`, `user_notification_preferences` |
| **Status** | Selesai |

### FR-014 - Penilaian Utilisasi Zona Gudang

| Atribut | Detail |
|---|---|
| **ID** | FR-014 |
| **Nama** | Warehouse Zone Utilization |
| **Deskripsi** | Supervisor/Admin dapat menilai status kecukupan zona gudang: CUKUP, MENDEKATI_PENUH, atau TIDAK_CUKUP |
| **User Story** | Sebagai Supervisor, saya ingin menilai kapasitas zona gudang agar penempatan barang optimal |
| **Aturan Bisnis** | `status_kecukupan_source`: AUTO atau MANUAL; Log perubahan di `zona_utilisasi_log`; Endpoint per-zona: `PATCH /api/zones/:zona_id/utilization-status` |
| **File Terkait** | `backend/src/modules/zone/zone.routes.js:40-46`, model `zona_gudang`, `zona_utilisasi_log` |
| **Status** | Selesai |

### FR-015 - Permintaan BOQ Tambahan

| Atribut | Detail |
|---|---|
| **ID** | FR-015 |
| **Nama** | BOQ Additional Request (Bottom-Up) |
| **Deskripsi** | Personil lapangan dapat mengajukan permintaan BOQ tambahan untuk barang yang belum tercakup atau qty-nya kurang |
| **User Story** | Sebagai personil lapangan, saya ingin mengajukan permintaan barang tambahan agar kebutuhan lapangan terpenuhi |
| **Aturan Bisnis** | Status: `diajukan -> ditinjau -> disetujui / ditolak`; Diajukan oleh `personil` (bukan `user`); Ditinjau oleh Supervisor/Admin |
| **File Terkait** | `backend/src/modules/permintaan-boq/`, model `permintaan_boq` |
| **Status** | Selesai |

---

## 8. Alur Pengguna (User Flow)

### Alur Login & Routing

```mermaid
flowchart TD
    A[Buka Aplikasi] --> B{Ada token di localStorage?}
    B -->|Ya| C[Validasi ke /api/auth/me]
    C -->|Valid| D{Role user?}
    C -->|Tidak Valid 401| E[Halaman Login]
    B -->|Tidak| E
    D -->|admin| F[/dashboard Admin]
    D -->|supervisor| G[/dashboard/supervisor]
    D -->|staff| H[/staff/dashboard]
    E --> I[Isi email + password]
    I --> J[POST /api/auth/login]
    J -->|Sukses| K{must_change_password?}
    K -->|Ya| L[Halaman Ganti Password]
    K -->|Tidak| D
    J -->|Gagal| M[Tampilkan error]
    M --> I
```

### Alur Surat Jalan Inbound (Staff)

```mermaid
flowchart TD
    A[Staff buat SJ Inbound] --> B[POST /api/surat-jalan/inbound/staff]
    B --> C[Status: draft_diajukan]
    C --> D[Verifikasi opsional]
    D --> E[Status: ready_putaway]
    E --> F[Staff terima barang POST receive-inbound]
    F --> G{Kondisi OK?}
    G -->|Ya| H[Stok ledger IN terbuat]
    G -->|Ada penolakan| I[Catat qty_ditolak + alasan]
    H --> J[Staff putaway ke zona POST putaway]
    J --> K[stok_gudang diupdate per zona]
```

### Alur Surat Jalan Outbound

```mermaid
flowchart TD
    A[Admin/Staff buat SJ Outbound] --> B[Sistem picking dari stok zona]
    B --> C[Status: draft_diajukan]
    C --> D[Supervisor review outbound queue]
    D -->|Setuju| E[PUT approve-outbound\nStatus: disetujui]
    D -->|Tolak| F[PUT reject-outbound\nStatus: ditolak]
    E --> G[Status: digenerate + generate PDF]
    G --> H[Staff mulai kirim\nStatus: sedang_dikirim]
    H --> I{Ada gudang transit?}
    I -->|Ya| J[POST transit/tiba\nStatus: tiba_di_transit]
    J --> K[POST transit/lanjut\nStatus: sedang_dikirim]
    K --> I
    I -->|Tidak| L[Staff lapor tiba\nStatus: tiba_menunggu_konfirmasi]
    L --> M[Supervisor konfirmasi\nPUT confirm-distributed]
    M --> N[Status: diterima_didistribusikan\nStok ledger OUT terbuat]
```

### Alur Rekonsiliasi Hardware

```mermaid
flowchart TD
    A[Admin/Supervisor] --> B[Download template\nGET /reports/reconciliation/template]
    B --> C[Isi data laporan mitra di Excel]
    C --> D[Upload Excel\nPOST /reports/reconciliation/upload]
    D --> E{Parsing berhasil?}
    E -->|Ada baris gagal| F[Tampilkan detail error]
    E -->|Semua sukses| G[Preview hasil upload]
    F --> H[Konfirmasi tetap lanjut]
    G --> H
    H --> I[POST /reports/reconciliation/confirm]
    I --> J[Data tersimpan di laporan_mitra]
    J --> K[Lihat Rekonsiliasi\nGET /reconciliation/inventory]
```

---

## 9. Halaman, Route & Komponen UI

### Halaman Frontend (Next.js App Router)

| Path | Nama Halaman | Role | File | Data Dimuat |
|---|---|---|---|---|
| `/` | Login | Public | `app/page.tsx` (14 KB) | - |
| `/forgot-password` | Lupa Password | Public | `app/forgot-password/` | - |
| `/reset-password` | Reset Password | Public | `app/reset-password/` | - |
| `/dashboard` | Dashboard Admin | Admin | `app/dashboard/page.tsx` (21 KB) | KPI, project summary, activities |
| `/dashboard/boq` | Cluster & BOQ | Admin | `app/dashboard/boq/` | BOQ list, stats |
| `/dashboard/delivery` | Surat Jalan Admin | Admin | `app/dashboard/delivery/page.tsx` (40 KB) | SJ inbound/outbound |
| `/dashboard/warehouse` | Gudang & Layout | Admin | `app/dashboard/warehouse/page.tsx` (56 KB) | Gudang, zona, utilisasi |
| `/dashboard/reconciliation` | Rekonsiliasi | Admin | `app/dashboard/reconciliation/` | Upload log, inventory |
| `/dashboard/reports` | Laporan & Audit | Admin | `app/dashboard/reports/page.tsx` (106 KB) | Stok history, audit log |
| `/dashboard/users` | Manajemen Pengguna | Admin | `app/dashboard/users/` | User list |
| `/dashboard/settings` | Pengaturan | All | `app/dashboard/settings/` | Preferensi notifikasi |
| `/dashboard/supervisor` | Dashboard Supervisor | Supervisor | `app/dashboard/supervisor/dashboard.tsx` (24 KB) | KPI supervisor |
| `/dashboard/supervisor/approval` | Antrian Approval | Supervisor | `app/dashboard/supervisor/approval/` | SJ menunggu approval |
| `/dashboard/supervisor/boq` | BOQ Supervisor | Supervisor | `app/dashboard/supervisor/boq/` | BOQ per cluster |
| `/dashboard/supervisor/warehousespv` | Utilisasi Gudang | Supervisor | `app/dashboard/supervisor/warehousespv/` | Zone utilization |
| `/dashboard/supervisor/reconciliation` | Rekonsiliasi & Area | Supervisor | `app/dashboard/supervisor/reconciliation/` | Rekonsiliasi, remains note |
| `/dashboard/supervisor/operasional` | Data Operasional & Tim | Supervisor | `app/dashboard/supervisor/operasional/` | Personil, kendaraan |
| `/master-data` | Master Data | Admin + Supervisor | `app/master-data/page.tsx` (124 KB) | Semua entitas master |
| `/staff/dashboard` | Tugas Saya | Staff | `app/staff/dashboard/` | Tugas aktif staff |
| `/staff/inbound` | Penerimaan | Staff | `app/staff/inbound/` | SJ inbound |
| `/staff/outbound` | Surat Jalan | Staff | `app/staff/outbound/` | SJ outbound |
| `/staff/putaway` | Lokasi & Rak | Staff | `app/staff/putaway/` | Zona gudang, stok |
| `/staff/history` | Riwayat | Staff | `app/staff/history/` | History transaksi |
| `/profile` | Profil | All | `app/profile/` | Data profil, avatar |
| `/notifications` | Notifikasi | All | `app/notifications/` | Daftar notifikasi |

### Komponen UI Utama

| Komponen | File | Fungsi |
|---|---|---|
| `CompactSidebar` | `components/CompactSidebar.tsx` (11 KB) | Sidebar collapsible dengan icon & tooltip, filter menu by role |
| `GlobalHeader` | `components/GlobalHeader.tsx` (18 KB) | Header: notifikasi badge, avatar, user menu |
| `ConfirmModal` | `components/ConfirmModal.tsx` | Modal konfirmasi generik |
| `BarangPicker` | `components/BarangPicker.tsx` (8 KB) | Search & select barang dengan autocomplete |
| `BoqPicker` | `components/BoqPicker.tsx` (9 KB) | Search & select BOQ |
| `TablePagination` | `components/TablePagination.tsx` | Paginasi tabel standar |
| `UserAvatar` | `components/UserAvatar.tsx` | Avatar dengan crop & upload |
| `WarehouseLayoutMap` | `components/WarehouseLayoutMap.tsx` | Visual map zona gudang |
| `AccountDeactivatedListener` | `components/AccountDeactivatedListener.tsx` | Deteksi 401 ACCOUNT_DEACTIVATED -> logout otomatis |

---

## 10. Model Data

> Dokumen detail ERD dan spesifikasi tabel tersedia di [data-model.md](./data-model.md).

### Ringkasan Entitas Utama

| Model (Tabel) | Fungsi |
|---|---|
| `user_account` | Akun pengguna sistem |
| `personil` | Data personil lapangan/gudang |
| `gudang` | Master gudang (tetap & dadakan) |
| `zona_gudang` | Zona/rak di dalam gudang |
| `project` | Master proyek |
| `cluster` | Sub-unit proyek dengan BOQ |
| `barang` | Master barang/material |
| `kategori_barang` | Kategori material |
| `satuan` | Satuan ukuran barang |
| `supplier` | Master supplier |
| `kendaraan` | Master kendaraan |
| `titik_lapangan` | Lokasi lapangan proyek |
| `boq` | Bill of Quantity per cluster |
| `boq_item` | Line item BOQ |
| `permintaan_boq` | Request BOQ bottom-up |
| `tiket_material` | Tiket material untuk tracking |
| `surat_jalan` | Dokumen pengiriman (inbound/outbound) |
| `surat_jalan_item` | Item dalam surat jalan |
| `surat_jalan_item_pick` | Detail picking per item |
| `surat_jalan_item_unit` | Kondisi per unit fisik |
| `surat_jalan_item_foto` | Foto dokumentasi item |
| `surat_jalan_transit` | Checkpoint gudang transit |
| `stok_gudang` | Posisi stok saat ini per gudang/zona/kondisi |
| `stok_ledger` | Ledger semua mutasi stok |
| `laporan_mitra` | Laporan rekonsiliasi dari mitra |
| `return_transaction` | Transaksi return material |
| `additional_adjustment` | Penyesuaian stok manual |
| `reconciliation_upload_log` | Log upload rekonsiliasi Excel |
| `reconciliation_upload_detail` | Detail baris upload rekonsiliasi |
| `reconciliation_remains_note` | Catatan sisa rekonsiliasi |
| `audit_log` | Log semua aksi sistem |
| `approval_log` | Log approval per entitas |
| `notification` | Notifikasi in-app |
| `user_notification_preferences` | Preferensi notifikasi per user |
| `user_gudang` | Mapping user ke gudang |
| `zona_utilisasi_log` | Log perubahan status utilisasi zona |
| `password_reset_token` | Token reset password |

---

## 11. Spesifikasi API

> Dokumen detail endpoint tersedia di [api-spec.md](./api-spec.md).

### Ringkasan Endpoint per Modul

| Prefix | Modul | Jumlah Endpoint Aktual |
|---|---|---|
| `/` | System Root | 1 |
| `/api/auth` | Autentikasi | 8 |
| `/api/warehouses` | Gudang | 11 |
| `/api/zones` | Zona Gudang | 6 |
| `/api/aisles` | Aisle (Lorong) | 6 |
| `/api/categories` | Kategori Barang | 6 |
| `/api/items` | Master Barang / Material | 5 |
| `/api/units` | Satuan | 6 |
| `/api/suppliers` | Supplier | 6 |
| `/api/vehicles` | Kendaraan | 5 |
| `/api/personnels` | Personil | 5 |
| `/api/projects` | Proyek | 7 |
| `/api/clusters` | Cluster Proyek | 6 |
| `/api/titik-lapangan` | Titik Lapangan | 6 |
| `/api/boqs` | Bill of Quantity (BOQ) | 18 |
| `/api/permintaan-boqs` | Permintaan BOQ Tambahan | 7 |
| `/api/surat-jalan` | Surat Jalan & Distribusi | 23 |
| `/api/dashboard` | Dashboard | 7 |
| `/api/reports` | Laporan & Rekonsiliasi | 14 |
| `/api/reconciliation` | Rekonsiliasi Lapangan | 3 |
| `/api/additional-adjustments` | Penyesuaian Tambahan (Adjustment) | 2 |
| `/api/notifications` | Notifikasi In-App | 6 |
| `/api/settings` | Pengaturan Sistem | 4 |
| `/api/users` | Manajemen Pengguna | 6 |
| `/api/profile` | Profil Pengguna | 2 |
| `/api/customers` | Customer | 6 |
| `/api/upload` | File Upload | 2 |
| **TOTAL** | | **184 Endpoints** |

---

## 12. Autentikasi & Otorisasi

### Mekanisme Login

1. Client mengirimkan `POST /api/auth/login` dengan `{ email, password }`
2. Backend verifikasi bcrypt password hash
3. Backend menghasilkan dua token:
   - **Access Token** (JWT): expire 24 jam, payload `{ id, email, role, avatar_url }`
   - **Refresh Token** (JWT): expire 7 hari, payload `{ id, email, type: "refresh" }`
4. Refresh token disimpan in-memory (Map) di backend — **[RISIKO: hilang saat server restart]**
5. Client menyimpan access token di `localStorage`

> Referensi: `backend/src/modules/auth/auth.service.js:33-68`

### Middleware Chain Backend

```
Request
  -> auth.middleware.js       (verifikasi JWT + cek is_aktif)
  -> role.middleware.js       (authorize berdasarkan roles)
  -> gudang-scope.middleware.js  (filter data per gudang user)
  -> Controller
```

Penjelasan masing-masing:
- **`auth.middleware.js`**: Membaca header `Authorization: Bearer <token>`, verifikasi JWT, query DB untuk cek `is_aktif`
- **`role.middleware.js`**: Membandingkan role user dengan roles yang diizinkan. Unauthorized attempt dicatat ke `audit_log`
- **`gudang-scope.middleware.js`**: Membatasi query data hanya untuk gudang yang terdaftar di `user_gudang` untuk pengguna Staff

### Proteksi Route Frontend

- **`ProtectedRoute`** (`frontend/lib/protected-route.tsx`): HOC yang memeriksa auth state dari `AuthContext`. Redirect ke `/` jika tidak terautentikasi
- **`AuthContext`** (`frontend/lib/auth-context.tsx`): Validasi session ke `/api/auth/me` saat mount. Mendukung graceful degradation (fallback ke localStorage jika backend tidak tersedia, timeout 5 detik)
- **`AccountDeactivatedListener`**: Mendeteksi respons `ACCOUNT_DEACTIVATED` dan menjalankan logout otomatis

### Role & Permission Matrix

| Aksi | Admin | Supervisor | Staff |
|---|---|---|---|
| Login, Logout, Profile | Ya | Ya | Ya |
| Master Data CRUD | Ya | Baca saja | Tidak |
| Buat/Edit BOQ | Ya | Ya | Tidak |
| Approve/Reject SJ Outbound | Tidak | Ya | Tidak |
| Konfirmasi Distribusi | Tidak | Ya | Tidak |
| Buat SJ Inbound | Ya | Tidak | Ya |
| Terima Inbound | Ya | Ya | Ya |
| Putaway & Retrieval | Ya | Ya | Ya |
| Transit Gudang | Tidak | Tidak | Ya |
| Laporan & Audit | Ya | Tidak | Tidak |
| Upload Rekonsiliasi | Ya | Ya | Tidak |
| Kelola Pengguna | Ya | Tidak | Tidak |
| Utilisasi Zona | Ya | Ya | Tidak |
| Additional Adjustment | Ya | Ya | Tidak |

---

## 13. Integrasi Pihak Ketiga

| Layanan | Tujuan | Implementasi | Konfigurasi |
|---|---|---|---|
| **PostgreSQL** | Database utama | Prisma ORM | `DATABASE_URL` env var |
| **ExcelJS** v4.4.0 | Generate & parse file Excel | Backend reports.service.js; Frontend exportReconciliationXlsx.ts | - |
| **xlsx** v0.18.5 | Parse file Excel upload | Backend rekonsiliasi | - |
| **@react-pdf/renderer** v4.6.0 | Generate PDF Surat Jalan | Frontend | - |
| **pdfjs-dist** 3.11.174 | Render/preview PDF | Frontend PdfViewerComponent.tsx | Override versi di package.json |
| **Multer** v2.2.0 | File upload handler | Backend upload.controller.js, users.controller.js | Local disk /uploads/ |

### Catatan Integrasi Email [TIDAK DITEMUKAN]

Sistem **belum mengintegrasikan** layanan email. Fungsi `forgotPassword` di `auth.service.js:172` hanya menghasilkan URL reset tanpa mengirimkan email. URL dikembalikan dalam response API, bukan dikirim ke pengguna.

---

## 14. Non-Functional Requirements

### NFR-001 - Keamanan

| Item | Implementasi | File |
|---|---|---|
| Password hashing | bcrypt | `backend/src/shared/password.js` |
| JWT expiry | Access: 24h, Refresh: 7d | `auth.service.js` |
| CORS | Whitelist origin: localhost:3000, 3001, 5173 | `backend/src/app.js:36` |
| Role-based access | `authorize()` middleware | `role.middleware.js` |
| Akun non-aktif | Cek `is_aktif` di setiap request | `auth.middleware.js:41-51` |
| Input validation | Zod schemas di setiap route | `validation.middleware.js` |
| Audit trail | `audit_log` untuk semua aksi | `role.middleware.js` + service |
| SQL injection protection | Prisma ORM (parameterized queries) | Seluruh repository |

### NFR-002 - Performa

| Item | Konfigurasi |
|---|---|
| Database index | 40+ index di schema.prisma (email, status, project_id, dll.) |
| JSON serialization | BigInt -> String di response middleware `app.js:58-68` |
| Frontend caching | SWR + TanStack Query dengan deduplication |
| Bundle analyzer | `@next/bundle-analyzer`, aktif via `ANALYZE=true` |

### NFR-003 - Responsivitas

- Layout menggunakan Tailwind CSS responsive breakpoints
- Sidebar collapsible dengan CSS transition
- Halaman staff didesain mobile-first (dari `MobileCardList.tsx`)

### NFR-004 - Error Handling

- Backend: Global error middleware (`error.middleware.js`) menangkap semua unhandled errors
- Custom `AppError` class dengan `statusCode` — `backend/src/shared/errors.js`
- Token expired: ditangani dengan redirect ke login
- Server log: `backend/server-out.log` dan `backend/server-err.log`

### NFR-005 - Logging

- HTTP request logging: **Morgan** (`dev` format) — `app.js:54`

### NFR-006 - Aksesibilitas

- [TIDAK DITEMUKAN] Tidak ada konfigurasi khusus aksesibilitas (ARIA, dll.) yang teridentifikasi

---

## 15. Konfigurasi & Environment

### Backend - Environment Variables

| Variable | Fungsi | Wajib | Format |
|---|---|---|---|
| `PORT` | Port server Express | Opsional (default 5000) | Angka |
| `DATABASE_URL` | PostgreSQL connection string | **Wajib** | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | Secret key untuk access token | **Wajib** | String random panjang |
| `JWT_REFRESH_SECRET` | Secret key untuk refresh token | **Wajib** | String random panjang |
| `JWT_REFRESH_EXPIRES` | Durasi refresh token | Opsional (default `7d`) | `7d`, `30d`, dll. |
| `NODE_ENV` | Environment mode | Opsional | `development` / `production` |
| `NEXT_PUBLIC_APP_URL` | URL frontend (untuk reset URL) | Opsional | `http://localhost:3000` |

### Frontend - Environment Variables

| Variable | Fungsi | Wajib | Format |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL backend API | **Wajib** | `http://localhost:5000` |
| `ANALYZE` | Aktifkan bundle analyzer | Opsional | `true` / `false` |

### Cara Menjalankan Lokal

```bash
# 1. Setup database PostgreSQL
psql -U postgres -c "CREATE DATABASE digitak_warehouse;"

# 2. Backend
cd backend
npm install
# Buat file .env dengan nilai yang sesuai
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev          # Berjalan di http://localhost:5000

# 3. Frontend (terminal baru)
cd frontend
npm install
# Buat file .env.local: NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev          # Berjalan di http://localhost:3000
```

### Script Backend

| Script | Perintah | Fungsi |
|---|---|---|
| `npm run dev` | `nodemon src/server.js` | Development dengan auto-reload |
| `npm start` | `node src/server.js` | Production |
| `npm run seed` | `node prisma/seed.js` | Seed data awal |
| `npm test` | Node built-in test runner | Jalankan semua unit test |

---

## 16. Testing & Quality

### Unit Test

| File Test | Modul | Framework |
|---|---|---|
| `backend/src/middlewares/gudang-scope.middleware.test.js` (9 KB) | Gudang Scope Middleware | Node.js built-in `--test` |
| `backend/src/modules/surat-jalan/surat-jalan.service.test.js` (31 KB) | Surat Jalan Service | Node.js built-in `--test` |
| `backend/src/modules/dashboard/dashboard.repository.test.js` (6 KB) | Dashboard Repository | Node.js built-in `--test` |

### Linting

- **Frontend**: ESLint 9 dengan `eslint-config-next` — `frontend/eslint.config.mjs`
- **Backend**: [TIDAK DITEMUKAN] Tidak ada konfigurasi ESLint/Prettier
- `frontend/lint-output.txt` (768 KB) menunjukkan banyak warning/error yang belum diselesaikan

### CI/CD

- [TIDAK DITEMUKAN] Tidak ada file konfigurasi CI/CD (`.github/workflows/`, `Jenkinsfile`, dll.)

---

## 17. Temuan & Risiko

### Risiko Tinggi

| ID | Temuan | Lokasi | Dampak |
|---|---|---|---|
| R-001 | **Refresh token disimpan in-memory (Map)** — hilang saat server restart | `auth.service.js:11` | Semua sesi logout saat restart |
| R-002 | **File .env berisi nilai aktual** (password DB, JWT secret) sudah di `.gitignore` tapi tetap berisiko | `backend/.env` | Kebocoran credential |
| R-003 | **Linting error besar** — `lint-output.txt` 768 KB mengindikasikan ratusan TypeScript/ESLint error | `frontend/` | Bug tersembunyi, code quality rendah |
| R-004 | **Tidak ada email service** — forgot password tidak mengirim email, URL reset hanya di response API | `auth.service.js:172` | Pengguna tidak bisa reset password mandiri |

### Risiko Sedang

| ID | Temuan | Lokasi | Dampak |
|---|---|---|---|
| R-005 | **Endpoint deprecated masih aktif** — `PUT /api/dashboard/warehouse-assessment/:gudangId` | `dashboard.routes.js:15-19` | Inkonsistensi API |
| R-006 | **Tidak ada rate limiting** — tidak ada middleware pembatas request | `app.js` | Rentan brute-force login |
| R-007 | **Tidak ada CI/CD pipeline** — deployment manual | Root | Risiko human error saat deploy |
| R-008 | **Coverage test rendah** — hanya 3 file test untuk 28 modul | `backend/src/` | Bug tidak terdeteksi |
| R-009 | **File helper debug masih ada** — 100+ file `check-*.js`, `fix-*.js` di root `frontend/` | `frontend/` | Membingungkan, repo kotor |

### Risiko Rendah / Technical Debt

| ID | Temuan | Lokasi |
|---|---|---|
| R-010 | Tidak ada Docker/containerization setup | Root |
| R-011 | Tidak ada dokumentasi API interaktif (Swagger/OpenAPI) | Backend |
| R-012 | Backup file masih ada di repo (`backup_before_cluster_reset.dump`) | `backend/` |
| R-013 | Banyak file `.js` sementara di root `backend/` (`_tmp_*.js`, `analyze_*.js`) | `backend/` |

---

## 18. Rekomendasi & Roadmap

### Prioritas Tinggi

1. **Implementasi email service** untuk forgot/reset password (SendGrid, Nodemailer, dll.)
2. **Migrasi refresh token ke database** agar persisten saat server restart
3. **Tambah rate limiting** (express-rate-limit) untuk endpoint auth
4. **Bersihkan lint errors** — resolve ratusan TypeScript/ESLint error di frontend
5. **Pastikan .env tidak pernah di-commit** — pertimbangkan secret management

### Prioritas Sedang

6. **Setup CI/CD pipeline** (GitHub Actions) untuk auto-test dan auto-deploy
7. **Dokumentasi API dengan Swagger/OpenAPI**
8. **Hapus file debug sementara** dari `frontend/` (100+ file check-*.js, fix-*.js)
9. **Bersihkan file sementara** dari `backend/`
10. **Tambah test coverage** untuk modul kritis: BOQ, Rekonsiliasi, Return, Notifikasi
11. **Remove/replace deprecated endpoint** `PUT /api/dashboard/warehouse-assessment/:gudangId`

### Prioritas Rendah

12. **Dockerize aplikasi** untuk kemudahan deployment
13. **Tambah endpoint health check** (`GET /health`) untuk monitoring
14. **Pertimbangkan Redis** untuk refresh token store agar lebih scalable
15. **Tambah ESLint untuk backend**
16. **Implementasi notifikasi real-time** (WebSocket/SSE)

### Fitur yang Tampak Belum Selesai

- **Modul `capacity`** di `backend/src/modules/capacity/` — ada folder tapi tidak di-mount di `app.js`
- **`customer` module** terdaftar di backend dan frontend tapi tidak ada di navigasi utama (`navigation.ts`)
- **Email delivery** untuk reset password link

---

## 19. Lampiran

### Glosarium

| Istilah | Definisi |
|---|---|
| BOQ | Bill of Quantity — daftar material yang direncanakan untuk satu cluster proyek |
| Cluster | Sub-unit dari proyek, memiliki BOQ tersendiri dan tiket material |
| Tiket Material | Identifier unik untuk tracking material per pekerjaan lapangan |
| Surat Jalan (SJ) | Dokumen resmi pengiriman/penerimaan barang |
| Putaway | Proses penempatan barang ke zona/rak spesifik setelah diterima |
| Retrieval/Picking | Proses pengambilan barang dari zona untuk persiapan pengiriman |
| Rekonsiliasi | Proses pencocokan data material gudang vs lapangan |
| Laporan Mitra | Laporan dari kontraktor/mitra lapangan tentang penggunaan material |
| Gudang Dadakan | Gudang transit sementara, berbeda dari gudang tetap |
| Stok Ledger | Catatan kronologis semua mutasi stok (in/out) |
| MOS | Material Order Sheet — acuan jumlah material yang dibutuhkan |
| Remains Lapangan | Sisa material yang masih ada di lapangan menurut laporan mitra |

### Daftar Dependensi Backend

| Paket | Versi | Fungsi |
|---|---|---|
| `@prisma/client` | ^6.16.3 | Prisma ORM client |
| `bcrypt` | ^6.0.0 | Password hashing |
| `cookie-parser` | ^1.4.7 | Parse HTTP cookies |
| `cors` | ^2.8.6 | CORS middleware |
| `dotenv` | ^17.4.2 | Load env variables |
| `exceljs` | ^4.4.0 | Generate/parse Excel |
| `express` | ^5.2.1 | Web framework |
| `express-async-handler` | ^1.2.0 | Async error wrapper |
| `jsonwebtoken` | ^9.0.3 | JWT sign & verify |
| `morgan` | ^1.11.0 | HTTP request logger |
| `multer` | ^2.2.0 | File upload middleware |
| `pg` | ^8.22.0 | PostgreSQL driver |
| `prisma` | ^6.16.3 | Prisma CLI |
| `xlsx` | ^0.18.5 | Excel parsing |
| `zod` | ^4.4.3 | Schema validation |
| `nodemon` | ^3.1.14 | Dev auto-reload |

### Daftar Dependensi Frontend

| Paket | Versi | Fungsi |
|---|---|---|
| `next` | 16.3.0 | React framework |
| `react` | 19.2.8 | UI library |
| `@tanstack/react-query` | ^5.101.4 | Server state management |
| `axios` | ^1.19.0 | HTTP client |
| `react-hook-form` | ^7.84.0 | Form management |
| `zod` | ^4.4.3 | Schema validation |
| `@react-pdf/renderer` | ^4.6.0 | PDF generation |
| `exceljs` | ^4.4.0 | Excel export |
| `lucide-react` | ^1.30.0 | Icon library |
| `tailwindcss` | ^4 | CSS framework |
| `shadcn` | ^4.16.1 | Component library |
| `swr` | ^2.5.1 | Data fetching |
| `react-easy-crop` | ^6.2.3 | Image crop |

### Daftar Asumsi yang Belum Terverifikasi

| ID | Asumsi | Alasan |
|---|---|---|
| A-001 | Email service tidak diimplementasi | Tidak ditemukan library SMTP di `package.json` dan `auth.service.js` hanya return URL |
| A-002 | Sistem masih running lokal (bukan production) | URL dan config hanya merujuk localhost |
| A-003 | Modul `capacity` belum diintegrasikan | Ada folder `backend/src/modules/capacity/` tapi tidak di-mount di `app.js` |
| A-004 | Halaman `customer` tidak digunakan aktif | Ada di backend dan frontend, tapi tidak ada di `navigationConfig` |
| A-005 | Metrik keberhasilan bisnis belum didefinisikan | Tidak ditemukan di kode atau dokumentasi |
| A-006 | Tidak ada pengiriman notifikasi real-time | Tidak ditemukan WebSocket/SSE implementation |
| A-007 | `gudang-scope.middleware.js` berlaku untuk Staff | Berdasarkan pola penggunaan di route surat-jalan |

---

*Dokumen ini di-generate dengan cara reverse-engineering dari codebase aktual pada 13 Oktober 2026. Informasi dapat diverifikasi dari file yang direferensikan.*
