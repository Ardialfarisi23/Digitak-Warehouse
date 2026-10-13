# LAPORAN DIAGNOSA MENYELURUH (MODE READ-ONLY)
**Project:** Digitak Warehouse (Fullstack: Express.js + Next.js App Router)  
**Tanggal Pemeriksaan:** 12 Oktober 2026  
**Status Evaluasi:** Mode Read-Only (Tanpa modifikasi file, tanpa instalasi paket, tanpa eksekusi mutasi data)

---

## 1. RINGKASAN EKSEKUTIF

Pemeriksaan komprehensif mode *Read-Only* telah dilakukan pada repository Digitak Warehouse mencakup backend Express.js, frontend Next.js 16 (React 19), serta struktur repositori secara keseluruhan. Dari aspek keamanan, sistem masih menyimpan credential sensitif (`DATABASE_URL`, `JWT_SECRET`, password hash) dalam file `.env` lokal, tidak menerapkan security headers (Helmet), dan memiliki dependensi kritis rentan terhadap IP spoofing serta Denial of Service (`proxy-addr`, `multer`, `xlsx`, `tar`). Dari aspek kebersihan repositori, ditemukan **565 file `node_modules` root** dan **140+ file script sementara/debug** yang ikut ter-track atau berserakan di repositori dengan akumulasi ukuran puluhan megabyte. Dari aspek performa, beban awal halaman landing dan bundle berpotensi terhambat oleh aset gambar mentah berukuran **3.5 MB (`hero.png`)**, ketiadaan HTTP compression / reverse proxy caching, serta dependensi frontend berat seperti `@react-pdf/renderer` dan `pdfjs-dist` tanpa *dynamic lazy-loading*.

### Skor Kesehatan Proyek per Area:
- 🛡️ **Keamanan (Security):** `62 / 100` *(Sedang - Butuh perbaikan segera pada security headers, penanganan secret, dan update package kritis)*
- 🧹 **Kebersihan File (Unused Files & Hygiene):** `45 / 100` *(Rendah - Penumpukan file artefak temporary debug, duplikat aset, serta tracked node_modules di root)*
- ⚡ **Performa (Performance):** `68 / 100` *(Sedang - Gambar hero 3.5 MB belum terkompresi, client-heavy rendering, dan paket PDF berat)*

---

## 2. TABEL TEMUAN LENGKAP

| No | Area | File / Baris | Risiko | Bukti / Temuan | Saran Perbaikan | Estimasi Dampak |
|:---|:---|:---|:---:|:---|:---|:---:|
| 1 | Keamanan | `backend/.env` (L1-8) | **Tinggi** | File `.env` lokal berisi konfigurasi plaintext koneksi database PostgreSQL, `JWT_SECRET`, dan `JWT_REFRESH_SECRET`. Meski saat ini `.env` di-ignore git, file berisiko terbaca jika terjadi directory traversal atau ter-commit manual. | Pastikan file `.env` tidak pernah dipush; gunakan `.env.example` sebagai template, dan simpan secret production di Secret Manager / Environment Hosting. | Mencegah kebocoran penuh database dan secret signing JWT token jika server terkompromi. |
| 2 | Keamanan | `backend/package.json`<br>`node_modules/proxy-addr` | **Tinggi** | `npm audit` mendeteksi kerentanan **CRITICAL** (GHSA-jqcg-44mw-7w3h, CVSS 9.1): `proxy-addr` rentan IP spoofing melalui IPv4-mapped IPv6 trust subnet. | Update dependensi Express/proxy-addr ke versi aman (`proxy-addr >= 2.0.8`) saat window maintenance. | Menggagalkan manipulasi IP client pada audit logging, rate limiting, dan pembatasan akses jaringan. |
| 3 | Keamanan | `backend/package.json`<br>`node_modules/multer` | **Tinggi** | Ditemukan 4 vulnerability High/Moderate pada `multer` (GHSA-wc9g-mqfw-jrwm, GHSA-qfvm-cv95-jqjf, GHSA-535w-7cp7-47q4): DoS via crafted multipart field names dan orphaned file descriptor leaks. | Upgrade multer ke versi `>= 2.3.0` atau beralih ke stream parser yang lebih aman saat perbaikan. | Mencegah penyerang melumpuhkan server backend via DoS resource exhaustion saat endpoint upload diserang. |
| 4 | Keamanan | `backend/package.json`<br>`node_modules/xlsx` | **Tinggi** | Package `xlsx` versi `0.18.5` memiliki kerentanan Prototype Pollution (GHSA-4r6h-8v6p-xvw6) dan ReDoS (GHSA-5pgg-2g8v-p4x9, CVSS 7.5). Digunakan pada import BOQ & Rekonsiliasi. | Gantikan pembacaan XLSX menggunakan library modern bebas celah atau upgrade/sandbox parser Excel (misal `exceljs` yang sudah terpasang). | Menghindari eksploitasi prototype pollution dan pembekuan event loop saat parsing file Excel berbahaya. |
| 5 | Keamanan | `backend/src/app.js`<br>`backend/src/server.js` | **Tinggi** | Tidak ada penerapan HTTP Security Headers (tidak menggunakan `helmet`). Header seperti `X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options`, dan `Strict-Transport-Security` tidak diinjeksi. | Pasang dan aktifkan middleware `helmet()` di baris awal pipeline `app.js`. | Melindungi aplikasi dari serangan clickjacking, MIME-sniffing, dan injeksi script lintas domain. |
| 6 | Keamanan | `frontend/lib/auth-context.tsx` (L53, 146)<br>`frontend/app/staff/dashboard/page.tsx` (L243) | **Sedang** | JWT Access Token disimpan langsung di `localStorage`. Token di `localStorage` rentan dicuri via skrip jahat pihak ketiga jika terjadi celah Cross-Site Scripting (XSS). | Migrasikan penyimpanan token ke `HttpOnly`, `Secure`, `SameSite=Strict` / `Lax` cookies dari backend response. | Menghilangkan risiko pencurian session/token credential pengguna secara instan dari client storage. |
| 7 | Keamanan | `backend/src/app.js` (L38-50) | **Sedang** | CORS mengizinkan beberapa origin lokal secara eksplisit termasuk `credentials: true`. Namun penanganan error CORS (`callback(new Error("Not allowed by CORS"))`) membocorkan internal log tanpa standard response API. | Gunakan environment variable dinamis `ALLOWED_ORIGINS` untuk production dan standarisasi response preflight error. | Mencegah eksploitasi CORS misconfiguration di environment production. |
| 8 | Keamanan | `backend/src/app.js` (L78-105)<br>`backend/src/modules/upload/upload.routes.js` | **Sedang** | Ketiadaan Rate Limiting pada API (`express-rate-limit`). Seluruh endpoint publik dan endpoint upload file dapat dibombardir request beruntun tanpa proteksi pembatasan frekuensi. | Tambahkan `express-rate-limit` pada endpoint autentikasi (`/api/auth/login`) dan endpoint unggah berkas (`/api/upload`). | Mencegah brute-force password login dan denial-of-service upload storage. |
| 9 | Keamanan | `backend/src/app.js` (L55)<br>`backend/uploads/` | **Sedang** | Folder `/uploads` di-serve secara publik langsung (`express.static`) tanpa validasi autentikasi per file atau pengecekan hak akses dokumen internal. | Buat endpoint stream file terproteksi (`/api/files/:filename`) yang memverifikasi JWT token pengguna sebelum mengirimkan file. | Dokumen internal, foto surat jalan, dan referensi BOQ tidak dapat diakses publik via URL tebakan. |
| 10 | File Tak Terpakai | Root folder: `node_modules/` | **Tinggi** | Folder `node_modules/pdfjs-dist/...` di root ter-commit ke dalam Git (**565 file** ter-track di index git). Padahal backend dan frontend memiliki `node_modules` masing-masing. | Jalankan `git rm -r --cached node_modules/` dan pastikan root `.gitignore` memuat `/node_modules`. | Menghemat ukuran clone repositori git hingga puluhan MB dan merapikan pohon source code. |
| 11 | File Tak Terpakai | Root & Backend:<br>`backup_before_boq_import_*.dump`<br>`backend/backup_before_cluster_reset.dump` | **Tinggi** | Ditemukan file dump database PostgreSQL biner di root dan backend (`*.dump`, total ~600 KB) yang ter-track di Git. | Pindahkan file dump database ke storage backup terisolasi di luar repository dan tambahkan `*.dump` ke `.gitignore`. | Menghindari kebocoran data operasional/relasional warehouse ke dalam riwayat repositori git. |
| 12 | File Tak Terpakai | Frontend root:<br>`check-*.js`, `find-*.js`, `fix-*.js`, `step7-*.js` (140+ files) | **Sedang** | Terdapat lebih dari **140 file script debugging dan patch temporary** di folder `frontend/` (total ukuran >1.3 MB) yang dibuat saat perbaikan sebelumnya. | Bersihkan atau arsipkan file script perbaikan tersebut ke folder `scripts/maintenance` terisolasi atau hapus jika sudah tidak digunakan. | Menghilangkan clutter drastis di direktori `frontend/`, mempercepat indexing IDE dan linting. |
| 13 | File Tak Terpakai | `frontend/public/` | **Sedang** | Terdapat file duplikat: `logo digitak .png` (216 KB) dan `logo-digitak.png` (216 KB), serta `logo digitak grdasi.png` (406 KB) dan `logo-digitak-gradasi.png` (406 KB). SVG default Next.js (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`) tidak digunakan. | Hapus file duplikat dengan spasi dan hapus aset default Next.js template. | Menghemat ~650 KB aset statis public dan mencegah kekeliruan import file. |
| 14 | File Tak Terpakai | `frontend/package.json` | **Rendah** | `@tanstack/react-query` (^5.101.4) terpasang di dependencies frontend, namun tidak ada satu pun import/penggunaan `useQuery` atau provider di seluruh codebase frontend (aplikasi menggunakan SWR dan axios native). | Hapus `@tanstack/react-query` dari `package.json` jika migrasi SWR telah permanen. | Mengurangi ukuran `node_modules` frontend dan mempercepat proses build / install. |
| 15 | Performa | `frontend/public/hero.png` | **Tinggi** | File gambar `hero.png` di landing page berukuran **3.501.347 bytes (~3.5 MB)** dalam format PNG mentah tanpa kompresi WebP/AVIF. | Konversi gambar menjadi format WebP atau AVIF modern beresolusi optimal (target ukuran < 150-200 KB, hemat ~95%). | Menurunkan LCP (Largest Contentful Paint) secara drastis dari beberapa detik menjadi < 500ms pada koneksi mobile/4G. |
| 16 | Performa | `frontend/next.config.ts`<br>`frontend/app/` | **Sedang** | Hampir 100% halaman (`48+ file`) diberi instruksi `"use client"`. Komponen berat seperti `@react-pdf/renderer` dan `pdfjs-dist` dimuat langsung tanpa code-splitting dinamis (`next/dynamic` dengan `ssr: false`). | Terapkan `next/dynamic` dengan lazy loading pada modal preview PDF dan pisahkan arsitektur Server Component pada layout/container. | Memangkas initial JS bundle footprint secara signifikan, menaikkan skor TTI (Time to Interactive). |
| 17 | Performa | `backend/src/app.js` | **Sedang** | Backend tidak mengaktifkan HTTP response compression (library `compression` belum dipasang pada Express.js). Response JSON data tabel besar (stok, BOQ, rekonsiliasi) dikirim polos. | Tambahkan middleware `compression()` pada Express. | Mengurangi ukuran payload transfer JSON hingga 60-80% pada endpoint list transaksi dan rekonsiliasi. |
| 18 | Performa | `backend/src/app.js` (L57-69) | **Rendah** | Middleware custom serializer BigInt melakukan `JSON.stringify` dan `JSON.parse` ulang pada setiap response `res.json()`, menyebabkan double-serialization CPU overhead pada setiap request. | Gunakan replacer function langsung pada response engine atau serializer BigInt level model/repository. | Menghemat alokasi memori heap Node.js dan siklus CPU pada throughput data besar. |

---

## 3. DAFTAR FILE TIDAK TERPAKAI / ARTEFAK SEMENTARA

Berikut adalah inventarisasi file tidak terpakai, duplikat, dan skrip temporer yang ditemukan di dalam repositori:

### A. File Root Project
| Nama File | Ukuran | Tingkat Keyakinan | Keterangan / Status |
|:---|:---:|:---:|:---|
| `backup_before_boq_import_20261009_092331.dump` | 225 KB | **Tinggi** | Dump snapshot database biner lokal, tidak boleh berada di repo. |
| `backup_before_boq_import_20261009_131039.dump` | 225 KB | **Tinggi** | Dump snapshot database biner lokal kedua. |
| `data import.xlsx` | 518 KB | **Tinggi** | File data uji coba import Excel lokal. |
| `examine_excel.js` & `examine_excel.py` | 3 KB | **Tinggi** | Skrip ad-hoc inspeksi excel manual. |
| `test_recon.js` | 3.2 KB | **Tinggi** | Skrip ad-hoc test manual rekonsiliasi. |
| `frontend_app___head_tmp_*.tsx` (4 file) | ~85 KB | **Tinggi** | Backup snapshot file frontend lama sebelum perbaikan header. |
| `.tmp_inbound.tsx` | 90 KB | **Tinggi** | File temporary duplikat dari halaman inbound. |
| `MobileCardList.tsx` | 0 B | **Tinggi** | File kosong (0 byte) di root directory. |
| `node_modules/` (root) | ~72.8 MB (565 file) | **Tinggi** | Paket node_modules ter-commit di root (duplikasi dari frontend/backend). |
| `.tmp/` (10 file cjs/js/txt) | 28 KB | **Tinggi** | Folder verifikasi ad-hoc query dan slice txt. |
| `ANALISIS_IMPORT_EXCEL.md`, `RINGKAS_STEP*.md` | ~25 KB | **Sedang** | Catatan tahapan kerja temporary (bisa dipindah ke folder `docs/archive`). |

### B. File Backend
| Nama File | Ukuran | Tingkat Keyakinan | Keterangan / Status |
|:---|:---:|:---:|:---|
| `backend/backup_before_cluster_reset.dump` | 150 KB | **Tinggi** | File dump database PostgreSQL biner. |
| `backend/backup_laporan_mitra_before_fix.txt` | 1.1 KB | **Tinggi** | Text backup lama sebelum perbaikan laporan mitra. |
| `backend/check_*.js` (14 file skrip ad-hoc) | ~25 KB | **Tinggi** | Skrip pengecekan cepat database/tabel (check_active_boq, check_batang, dll). |
| `backend/_tmp_*.js` (5 file skrip) | ~7.8 KB | **Tinggi** | Skrip sementara migrasi enum dan http test. |
| `backend/temp_audit_ledger.js` | 1.1 KB | **Tinggi** | Skrip inspeksi audit ledger sementara. |
| `backend/test_boq_cluster.js`, `test_recon.js` | ~4.7 KB | **Tinggi** | Skrip tes ad-hoc non-standard (bukan di folder tests). |
| `backend/server-out.log` & `server-err.log` | ~1 KB | **Tinggi** | File log server lokal (harus di-ignore). |
| `backend/assign-spv.cjs`, `cleanup_test_boq.js` | ~3.1 KB | **Perlu Verifikasi** | Skrip seeding/cleanup utilitas lokal, mungkin berguna untuk dev tooling namun sebaiknya dipindah ke `backend/scripts/dev/`. |

### C. File Frontend
| Nama File | Ukuran | Tingkat Keyakinan | Keterangan / Status |
|:---|:---:|:---:|:---|
| `frontend/.tmp_inbound.tsx` | 90 KB | **Tinggi** | File cadangan duplikat inbound. |
| `frontend/build_output.txt`, `build_output2.txt` | 6.7 KB | **Tinggi** | Log teks output build. |
| `frontend/lint-output.txt` | 768 KB | **Tinggi** | Log output eslint lama berukuran besar. |
| `frontend/tsc-out.txt` | 346 B | **Tinggi** | Log output TypeScript compiler. |
| `frontend/check-*.js` (40+ file) | ~15 KB | **Tinggi** | Kumpulan skrip node one-liner pencari error regex/braces. |
| `frontend/find-*.js` (25+ file) | ~20 KB | **Tinggi** | Kumpulan skrip ad-hoc pelacak komponen dan syntax. |
| `frontend/fix-*.js` (25+ file) | ~60 KB | **Tinggi** | Kumpulan skrip manipulasi string regex otomatis. |
| `frontend/step7-*.js` (10 file) | ~140 KB | **Tinggi** | Skrip otomatisasi tahapan migrasi lama. |
| `frontend/public/logo digitak .png` | 216 KB | **Tinggi** | Duplikat persis dari `logo-digitak.png` (memiliki nama berspasi). |
| `frontend/public/logo digitak grdasi.png` | 406 KB | **Tinggi** | Duplikat persis dari `logo-digitak-gradasi.png` (memiliki typo dan spasi). |
| `frontend/public/next.svg`, `vercel.svg`, dll (5 file) | ~3 KB | **Tinggi** | SVG template bawaan `create-next-app` tidak terpakai. |
| `frontend/tsconfig.tsbuildinfo` | 171 KB | **Sedang** | Cache build TypeScript, sebaiknya masuk `.gitignore`. |

---

## 4. TOTAL RUANG YANG BISA DIHEMAT

Perhitungan ruang penyimpanan disk fisik dan repositori git yang dapat dibebaskan jika seluruh file tidak terpakai, duplikat, dan file sementara dibersihkan:

| Kategori Pembersihan | Estimasi Ukuran |
|:---|---:|
| Root `node_modules/` (ter-track di git) | **72.83 MB** |
| Aset Gambar Mentah & Duplikat (`hero.png` dioptimasi + 2 logo duplikat) | **3.92 MB** |
| File Log Frontend (`lint-output.txt`, build logs) | **0.78 MB** |
| Database Dump Files (`*.dump` di root dan backend) | **0.60 MB** |
| Sample Excel & Temp Script Frontend (140+ files) | **1.85 MB** |
| Backup Snippet & Script Backend Sementara | **0.25 MB** |
| **TOTAL ESTIMASI RUANG YANG BISA DIHEMAT:** | **~ 80.23 MB** |

*(Catatan: Penghapusan file-file ini dari riwayat git atau working tree juga akan mempercepat waktu `git status`, IDE code indexing, linting, serta proses deployment CI/CD).*

---

## 5. URUTAN PRIORITAS PERBAIKAN (ACTION PLAN)

Jika perbaikan akan ditindaklanjuti pada sesi kerja berikutnya (mode write), berikut adalah urutan prioritas yang direkomendasikan berdasarkan dampak risiko:

### Prioritas 1: Kritis (Keamanan & Stabilitas - Segera)
1. **Pasang Security Headers di Backend**: Tambahkan package `helmet` pada `backend/src/app.js` untuk mengaktifkan proteksi standar browser.
2. **Perbarui Dependensi Kritis Backend**: Jalankan upgrade terukur untuk `proxy-addr` (mengatasi CVE IP spoofing) dan `multer` (mengatasi CVE Denial of Service).
3. **Audit Token Storage**: Rencanakan migrasi penyimpanan token JWT dari `localStorage` browser ke cookie `HttpOnly` untuk menangkal serangan XSS token extraction.
4. **Implementasikan Rate Limiter**: Pasang `express-rate-limit` pada endpoint sensitif (`/api/auth/login` dan `/api/upload`).

### Prioritas 2: Tinggi (Kebersihan Repositori & Git Hygiene)
1. **Hapus `node_modules` dari Tracking Git Root**: Jalankan `git rm -r --cached node_modules` dari root project dan perbarui `.gitignore` utama agar tidak lagi mencatat dependensi build.
2. **Karantina / Hapus File Dump Database**: Hapus file `*.dump` dari root dan `backend/` serta pastikan ekstensi `*.dump` dimasukkan ke `.gitignore` global project.
3. **Bersihkan 140+ Skrip Debugging di Frontend**: Hapus seluruh file `check-*.js`, `find-*.js`, `fix-*.js`, `step7-*.js`, dan log txt di `frontend/`.
4. **Hapus File Duplikat Public**: Hapus file `logo digitak .png` dan `logo digitak grdasi.png` di `frontend/public/`.

### Prioritas 3: Sedang (Optimasi Performa & User Experience)
1. **Kompresi Aset Gambar**: Kompres dan ubah `hero.png` (3.5 MB) ke format WebP (~100-200 KB) dengan dimensi yang disesuaikan untuk kontainer landing page.
2. **Aktifkan Kompresi Gzip/Brotli di Backend**: Tambahkan middleware `compression` pada `backend/src/app.js` untuk mempercepat transfer payload tabel berukuran besar.
3. **Penerapan Dynamic Import Komponen Berat**: Gunakan `next/dynamic` dengan `ssr: false` pada komponen render PDF (`@react-pdf/renderer` dan `pdfjs-dist`).
4. **Pembersihan Dependensi Frontend yang Tidak Dipakai**: Hapus `@tanstack/react-query` dari `frontend/package.json` karena aplikasi telah menggunakan `swr`.
