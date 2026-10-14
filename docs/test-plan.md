# Test Plan — Digitak Warehouse Management System

> **Dokumen:** QA Master Test Plan  
> **Aplikasi:** Digitak Warehouse (Sistem Informasi Manajemen Gudang Internal)  
> **Versi:** 1.0  
> **Target Environment:** Local Staging (`http://localhost:3000` & API `http://localhost:5000`)  
> **Penulis:** Senior QA Automation Engineer  
> **Tanggal:** 14 Oktober 2026  

---

## 1. Pendahuluan & Ringkasan Eksekutif

Dokumen ini mendefinisikan strategi, ruang lingkup, metodologi, lingkungan, prioritas, kriteria kelulusan, dan tata kelola pengujian end-to-end (E2E) serta blackbox testing untuk aplikasi **Digitak Warehouse Management System**.

Sistem ini memiliki peran kritis dalam pencatatan material jaringan telekomunikasi, validasi alokasi Bill of Quantity (BOQ), pergerakan barang (Inbound, Outbound, Putaway, Delivery Transit), verifikasi approval bertingkat antar peran (Admin General, Supervisor, Staf Gudang), dan rekonsiliasi hardware lapangan.

---

## 2. Ruang Lingkup Pengujian (Test Scope)

### 2.1 In-Scope (Fitur yang Diuji)

1. **Autentikasi & Otorisasi (RBAC):**
   - Login dengan validasi kredensial, proteksi brute-force/format email, auto-redirection berbasis peran (`admin_general`, `supervisor`, `staf_gudang`).
   - Forgot password & reset password flow.
   - Session retention (JWT di `localStorage`, validasi ke `/api/auth/me`).
   - Logout dan pembersihan token/sesi.
   - Role-Based Access Control (RBAC): pembatasan hak akses route admin vs supervisor vs staff (negative authorization testing).

2. **Master Data Management:**
   - CRUD entitas inti: Gudang, Zona/Rak, Kategori, Barang, Satuan, Supplier, Kendaraan, Personil, Proyek, Cluster, Titik Lapangan.
   - Validasi kelengkapan form, duplikasi kode/nama, format nomor HP/NIK.

3. **Inbound & Putaway (Penerimaan Barang):**
   - Pembuatan draft Inbound Surat Jalan oleh Staf Gudang (`POST /api/surat-jalan/inbound/staff`).
   - Verifikasi dan penerimaan barang (kondisi baik vs rusak/ditolak).
   - Putaway material ke zona dan rak penyimpanan (`POST /api/surat-jalan/:id/putaway`).
   - Verifikasi mutasi ledger stok masuk (`stok_ledger` bertambah).

4. **Outbound, Picking, Delivery & Approval Workflow:**
   - Pembuatan draft Outbound Surat Jalan berbasis stok tersedia per zona.
   - Antrian approval supervisor: persetujuan (`approve-outbound`) dan penolakan (`reject-outbound` dengan alasan penolakan).
   - Pengiriman surat jalan: status `sedang_dikirim`, transit gudang dadakan (tiba/lanjut), pelaporan tiba (`tiba_menunggu_konfirmasi`).
   - Konfirmasi akhir penerimaan/distribusi oleh Supervisor (`confirm-distributed`).
   - Verifikasi mutasi ledger stok keluar (`stok_ledger` berkurang).

5. **Cluster & BOQ (Bill of Quantity):**
   - Pembuatan dan pengelolaan BOQ per cluster.
   - Pengecekan sisa kuota BOQ terhadap pengeluaran Surat Jalan.

6. **Rekonsiliasi Hardware Lapangan:**
   - Akses modul rekonsiliasi dan download template laporan mitra.
   - Pengunggahan file Excel laporan mitra, penanganan parsing error, dan konfirmasi hasil rekonsiliasi.

7. **Laporan, Audit Log & Notifikasi:**
   - Riwayat mutasi stok gudang, filter periode, filter tipe transaksi.
   - Audit trail untuk setiap operasi penting (update user, hapus data, status change).
   - In-app notification per role.

### 2.2 Out-of-Scope

- Stress test / Load testing ratusan ribu concurrent users (fokus saat ini fungsional, integritas data, dan E2E UI).
- Pengiriman email riil melalui SMTP eksternal (sistem saat ini mengembalikan reset token/URL langsung pada response API).
- Integrasi ERP/SAP pihak ketiga (belum ada interface di codebase).
- Aplikasi native Android/iOS.

---

## 3. Strategi & Tingkat Prioritas Pengujian

Pengujian dilakukan dengan pendekatan multi-layer:
1. **Blackbox Testing Komprehensif:** Menggunakan teknik Equivalence Partitioning (EP), Boundary Value Analysis (BVA), Decision Table, State Transition, dan Error Guessing untuk memastikan ketahanan input-output tanpa melihat implementasi internal.
2. **End-to-End (E2E) Automation:** Memetakan user journey lengkap lintas peran (Staff membuat inbound/outbound -> Supervisor meng-approve -> Admin memantau di laporan & audit log).

### Prioritas Pengujian

| Level Prioritas | Kriteria Fitur | Contoh Area Pengujian | Target Cakupan |
|---|---|---|---|
| **Critical (P0)** | Alur bisnis utama yang memblokir operasional jika gagal | Login/Auth, RBAC protection, Inbound receive, Outbound approval, Ledger stock mutation | 100% lulus |
| **High (P1)** | Fitur operasional harian yang esensial | Putaway, Delivery status transition, CRUD Master Barang & Gudang, BOQ quota tracking | 100% lulus |
| **Medium (P2)** | Fitur pendukung berkala dan manajemen sekunder | Rekonsiliasi Excel upload, User Management, Filter laporan, Audit log | >= 95% lulus |
| **Low (P3)** | Personalisasi dan preferensi non-kritis | Ganti foto profil avatar, update preferensi notifikasi, pagination styling | >= 90% lulus |

---

## 4. Environment, Tools & Data Uji

### 4.1 Environment

- **Frontend URL:** `http://localhost:3000` (Next.js 16 App Router, Node.js v24/v20)
- **Backend API URL:** `http://localhost:5000` (Express.js REST API)
- **Database:** PostgreSQL (`digitak_warehouse` lokal)
- **Browser:** Chromium (Headless & Headed via Playwright & Chrome Subagent)

### 4.2 Automation Tools & Libraries

- **Framework E2E:** Playwright Test Runner (`@playwright/test`)
- **Bahasa:** TypeScript / JavaScript Modern
- **Pola Desain:** Page Object Model (POM)
- **Reporter:** Playwright HTML Reporter, List Reporter, dan Markdown Summary Report
- **State Capture:** Automated Screenshots on Failure & Trace Recording

### 4.3 Data Uji (Test Accounts & Fixtures)

| Peran | Akun Email | Password | Role Backend | Deskripsi Penggunaan |
|---|---|---|---|---|
| **Admin General** | `admin@digitakgudang.com` | `admin123` | `admin_general` | Full master data, audit, user management |
| **Supervisor** | `budi.santoso@digitakgudang.com` | `supervisor123` | `supervisor` | Approval antrian, konfirmasi distribusi, utilisasi |
| **Staf Gudang** | `fajar.hidayat@digitakgudang.com` | `fajar123` | `staf_gudang` | Input inbound, proses outbound picking, putaway |
| **User Nonaktif** | `staff@gmail.com` | `123456` | `staf_gudang` | Pengujian error rejection akun dinonaktifkan (`is_aktif=false`) |
| **Invalid User** | `unknown@example.com` | `wrongpass` | N/A | Pengujian penolakan kredensial salah |

---

## 5. Kriteria Masuk dan Keluar (Entry & Exit Criteria)

### 5.1 Entry Criteria (Syarat Memulai Pengujian)
- [x] Backend Express API aktif di `http://localhost:5000` dan database PostgreSQL terkoneksi.
- [x] Frontend Next.js aktif di `http://localhost:3000`.
- [x] Database memiliki data seed aktif untuk ketiga peran pengguna.
- [x] Dokumen spesifikasi kebutuhan dan API spec tersedia.

### 5.2 Exit Criteria (Syarat Penyelesaian Pengujian)
- Seluruh skenario E2E dan Blackbox tingkat Critical (P0) dan High (P1) telah dieksekusi dengan status LULUS (PASS).
- Tidak ada bug severity blocker/critical yang belum teridentifikasi atau tidak terdokumentasi.
- Seluruh bug fungsional yang ditemukan dicatat secara terstruktur dengan langkah reproduksi dan bukti.
- Laporan akhir pengujian (`docs/test-report.md`) telah disusun lengkap.
