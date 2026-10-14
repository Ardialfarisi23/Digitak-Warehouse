# Test Report — Digitak Warehouse Management System

> **Dokumen:** Laporan Hasil Pengujian E2E & Blackbox
> **Aplikasi:** Digitak Warehouse (Sistem Informasi Manajemen Gudang Internal)
> **Versi:** 1.0
> **Tanggal Eksekusi:** 14 Oktober 2026
> **Environment:** Local Staging — Frontend `http://localhost:3000` (Next.js), API `http://localhost:5000` (Express.js), PostgreSQL
> **Pelaksana:** Senior QA Automation Engineer

---

## 1. Ringkasan Eksekutif

Pengujian end-to-end (E2E) dan blackbox testing telah dilaksanakan terhadap fitur inti aplikasi Digitak Warehouse menggunakan Playwright Test + TypeScript dengan pola Page Object Model (POM), fixture terpisah, dan data uji terpisah dari logika test.

| Metrik | Nilai |
|---|---|
| **Total test dieksekusi** | **33** |
| **Lulus (PASS)** | **33** |
| **Gagal (FAIL)** | **0** |
| **Dilewati (SKIP)** | **0** |
| **Lulus rate** | **100%** |
| **Durasi eksekusi** | ± 1,4 menit (run 1), ± 1,8 menit (run 2) |
| **Jumlah run verifikasi idempotensi** | 2 kali berturut-turut — hasil identik (33/33) |

**Kesimpulan:** Seluruh skenario Critical (P0) dan High (P1) yang diotomasi **LULUS**. Tidak ditemukan **bug fungsional** aplikasi. Enam kegagalan pada run awal (baseline) telah terdiagnosis semuanya sebagai **kesalahan test** (bukan bug aplikasi) dan telah diperbaiki — lihat Bagian 4. Beberapa temuan non-blocking terkait aksesibilitas dan arsitektur RBAC dicatat sebagai observation (Bagian 5).

---

## 2. Lingkungan & Konfigurasi Eksekusi

| Item | Detail |
|---|---|
| Framework | Playwright Test (`@playwright/test` ^1.50), TypeScript |
| Browser | Chromium (Desktop Chrome, headless) |
| Base URL | `http://localhost:3000` (diatur via `BASE_URL`) |
| API URL | `http://localhost:5000` (diatur via `API_BASE_URL`) |
| Paralelisme | `workers: 1`, `fullyParallel: false` (mutasi state gudang harus berurutan) |
| Retry | 0 (deterministik) |
| Reporter | List + HTML (`playwright-report/`) + JSON (`test-results/results.json`) |
| Bukti visual | Screenshot otomatis saat gagal + video saat gagal + screenshot bukti skenario kritis (`test-results/evidence/`) |
| Akun uji | `admin@digitakgudang.com`, `budi.santoso@digitakgudang.com`, `fajar.hidayat@digitakgudang.com` (seed data lokal, BUKAN kredensial produksi) |

---

## 3. Komposisi Test Suite

| Suite | File | Jumlah Test | Cakupan |
|---|---|---|---|
| Autentikasi & Sesi | `tests/blackbox/auth.spec.ts` | 12 | AUTH-01 s/d AUTH-12 (login multi-peran, kredensial salah, format email, BVA password, form kosong, SQLi, akun nonaktif, logout & session cleanup) |
| RBAC | `tests/blackbox/rbac.spec.ts` | 6 | RBAC-01 s/d RBAC-06 (route guard staff/supervisor, menu visibility, API 403 untuk role tak berwenang, akses tanpa token) |
| API Contracts & Business Rules | `tests/blackbox/api-contracts.spec.ts` | 4 | INB-02 (items kosong → 400), INB-03 (qty 0 → 400), AUTH-10-API (SQLi → 400, tanpa token), AUTH-API-04 (body tidak lengkap) |
| Inbound (UI) | `tests/blackbox/inbound.spec.ts` | 3 | INB-01 (page load) + 2 supplemental UI regression (search no-match, buka/tutup modal) |
| Master Data | `tests/blackbox/master-data.spec.ts` | 4 | MSTR-01, MSTR-04, MSTR-06 (tabel & tab), MSTR-10 (XSS safety) |
| E2E Journey | `tests/e2e/*.spec.ts` | 4 | E2E-01 (auth multi-peran & RBAC lintas siklus), E2E-02-inti (pembuatan Surat Jalan Inbound penuh via UI), E2E-02 (navigasi putaway/laporan), E2E-03 (antrian approval supervisor) |

---

## 4. Analisis Kegagalan Run Awal (Baseline) — Bug Aplikasi vs Kesalahan Test

Run pertama menghasilkan **19 lulus, 6 gagal**. Setelah investigasi (error context, page snapshot, verifikasi API), **seluruh 6 kegagalan adalah kesalahan test**, bukan bug aplikasi:

| # | Test Gagal | Diagnosis Akar Masalah | Klasifikasi | Perbaikan yang Dilakukan |
|---|---|---|---|---|
| 1 | AUTH-06 (email tidak valid) | Input `type="email"` memicu **validasi native browser** yang memblokir submit sebelum pesan Zod "Format email tidak valid" dirender. Ekspektasi test tidak sesuai perilaku nyata. | **Kesalahan test** | Assertion diubah ke: field ditandai `:invalid` oleh browser + URL tetap di halaman login (`expectNativeEmailValidationBlocked`). |
| 2 | AUTH-10 (SQL injection) | Sama seperti #1 — payload SQLi tidak lolos format email native, form tidak terkirim. | **Kesalahan test** | Sama seperti #1 + assertion URL tidak menuju dashboard. |
| 3 | RBAC-06 (akses tanpa token) | `page.evaluate()` dipanggil saat halaman masih `about:blank` → `SecurityError: localStorage access denied`. | **Kesalahan test** | `clearSession()` sekarang navigasi ke `/` terlebih dahulu sebelum membersihkan storage. |
| 4 | RBAC-03 (menu supervisor) | Sidebar default **collapsed** (icon-only) sehingga label menu tidak ter-render; locator berbasis teks gagal. | **Kesalahan test** | Ditambahkan `ensureSidebarExpanded()` (auto-wait tombol toggle, klik expand) sebelum assertion teks; assertion tambahan berbasis `href` yang stabil. |
| 5 | RBAC-05 (menu admin) | Sama seperti #4. | **Kesalahan test** | Sama seperti #4. |
| 6 | E2E-01 (journey multi-peran) | Kombinasi #4 + **Next.js dev overlay** (`nextjs-portal`) mencegat pointer events sehingga klik logout/expand gagalberulang (57× retry), ditambah durasi journey melebihi timeout 30s. | **Kesalahan test** | Fixture `ui-fixtures.ts` menyembunyikan dev overlay via init script (tanpa mengubah kode aplikasi) + `test.slow()` untuk journey panjang. |

**Catatan penting:** Tidak ada satu pun kode aplikasi yang diubah untuk "membetulkan" perilaku aplikasi dalam proses ini. Semua perbaikan dilakukan di sisi test, sesuai ketentuan.

---

## 5. Bug & Observation Aplikasi

### 5.1 Bug Fungsional

**Tidak ada bug fungsional severity Blocker/Critical/High yang ditemukan.** Semua assertion happy-path dan negative-path yang diotomasi berperilaku sesuai spesifikasi.

### 5.2 Observation (Non-Blocking, Rekomendasi Perbaikan)

| ID | Observation | Severity | Bukti / Lokasi | Rekomendasi |
|---|---|---|---|---|
| OBS-01 | Link sidebar bersifat **icon-only saat collapsed tanpa `aria-label`/teks alternatif** — menyulitkan screen reader dan assertion berbasis aksesibilitas. | Low | `frontend/components/CompactSidebar.tsx:118-167` (span label hanya render saat `!collapsed`) | Tambahkan `aria-label={item.title}` pada komponen `Link` sidebar. |
| OBS-02 | Validasi format email mengandalkan **native browser (tooltip bahasa Inggris)** daripada pesan Zod terlokalisasi "Format email tidak valid" — pesan Zod tidak pernah tampil di browser nyata. | Low (UX) | `frontend/app/page.tsx:293-301` (`type="email"` mem-blocksubmit sebelum Zod) | Ubah menjadi `type="text"` + `inputMode="email"` agar pesan Zod yang konsisten (Bahasa Indonesia) yang tampil. |
| OBS-03 | RBAC route-level tidak terpusat: `ProtectedRoute` hanya memeriksa autentikasi; pembatasan role diterapkan **per halaman** (guard manual, redirect `window.location.href`) atau **per layout** (`dashboard/supervisor/layout.tsx`). Pola tidak konsisten — halaman baru yang lupa guard berisiko terekspos. | Medium (maintainability / defense-in-depth) | `frontend/lib/protected-route.tsx:13-26`, `frontend/app/dashboard/users/page.tsx:117-130`, `frontend/app/dashboard/supervisor/layout.tsx:17` | Tambahkan peta route→role terpusat (mis. `route-permissions.ts`) yang diperiksa oleh `ProtectedRoute`, pertahankan guard API sebagai lapis kedua. |
| OBS-04 | Bentuk response API tidak konsisten: beberapa endpoint membungkus array di `data.data` (projects, boqs, warehouses, items), beberapa di `data` langsung (clusters). | Low (konsistensi API) | Terverifikasi via `/api/projects` vs `/api/clusters` | Standarkan envelope response (`data` langsung + `meta` paginasi) atau dokumentasikan per endpoint. |

---

## 6. Cakupan Fitur: Teruji vs Belum Teruji

### 6.1 Matriks Cakupan Blackbox (dari 68 kasus terdokumentasi)

| Modul | Total Kasus Dokumen | Terotomasi | Belum Terotomasi | Catatan |
|---|---|---|---|---|
| Autentikasi & Sesi | 12 | **12** | 0 | AUTH-01 s/d AUTH-12 lengkap (AUTH-10 juga di level API) |
| RBAC | 6 | **6** | 0 | Termasuk RBAC-04 via API (supervisor → 403) |
| Master Data | 10 | **4** | 6 | Terotomasi: MSTR-01, 04, 06, 10. Belum: MSTR-02, 03, 05, 07, 08, 09 (form CRUD create/duplicate/capacity) |
| Inbound & Putaway | 10 | **5** | 5 | Terotomasi: INB-01, INB-02, INB-03, INB-08 (alur create penuh UI), + 2 supplemental. Belum: INB-04 s/d INB-07, INB-09, INB-10 (receive/putaway transition, upload file) |
| Outbound & Approval | 12 | **0** | 12 | Belum diotomasi (E2E-03 navigasi antrian approval sudah ada; alur approve/reject/delivery belum) |
| Cluster & BOQ | 6 | **0** | 6 | Belum diotomasi |
| Rekonsiliasi | 6 | **0** | 6 | Belum diotomasi (butuh fixture file Excel) |
| Laporan, Audit & User | 6 | **0** | 6 | Belum diotomasi |
| **Total** | **68** | **27** | **41** | **±40% terdokumentasi terotomasi**, 100% prioritas Critical (Auth/RBAC) |

### 6.2 Cakupan E2E

| Skenario | Status | Bukti |
|---|---|---|
| E2E-01: Autentikasi multi-peran & proteksi RBAC (3 siklus login/logout + direct URL attack) | **Terotomasi & LULUS** | `test-results/evidence/e2e-01-*.png` (3 screenshot: dashboard admin, supervisor, staff) |
| E2E-02 (inti): Pembuatan Surat Jalan Inbound lengkap via UI (pilih project→cluster→BOQ aktif→gudang→kendaraan→item→submit→verifikasi di tabel) | **Terotomasi & LULUS** | `test-results/evidence/e2e-02-inbound-form-filled.png`, `e2e-02-inbound-saved.png` |
| E2E-02 (navigasi): Inbound → Putaway/Lokasi Rak → Riwayat → Laporan Admin | **Terotomasi & LULUS** | Trace/video on-failure (tidak ada failure) |
| E2E-03: Antrian approval supervisor & navigasi delivery | **Terotomasi & LULUS** | — |
| E2E-04: Penolakan outbound & rollback stok | **Belum diotomasi** | Butuh data SJ outbound draft; direkomendasikan sebagai iterasi berikutnya |
| E2E-05: Rekonsiliasi Excel (download template, upload invalid/valid) | **Belum diotomasi** | Butuh fixture file `.xlsx` |

---

## 7. Perubahan pada Kode Aplikasi

Sesuai ketentuan, **tidak ada file aplikasi yang dihapus atau dimodifikasi logikanya**. Satu-satunya perubahan adalah penambahan atribut `data-testid` (tantangan selector yang diperlukan untuk automation stabil) pada **satu file**:

**File:** `frontend/app/staff/inbound/page.tsx`

| Atribut | Elemen |
|---|---|
| `data-testid="inbound-open-modal"` | Tombol "Input Inbound" |
| `data-testid="inbound-project-select"` | Select Project |
| `data-testid="inbound-cluster-select"` | Select Cluster |
| `data-testid="inbound-nomor-sj"` | Input Nomor Surat Jalan |
| `data-testid="inbound-tanggal"` | Input Tanggal Masuk |
| `data-testid="inbound-gudang-tujuan"` | Select Gudang Tujuan |
| `data-testid="inbound-asal-external"` | Tombol pilih asal "External" |
| `data-testid="inbound-vendor-manual-toggle"` | Checkbox "Vendor belum terdaftar? Ketik manual" |
| `data-testid="inbound-vendor-manual-name"` | Input nama vendor manual |
| `data-testid="inbound-pic"` | Input PIC / Penerima |
| `data-testid="inbound-kendaraan"` | Input Kendaraan |
| `data-testid="inbound-no-polisi"` | Input No. Polisi |
| `data-testid="inbound-driver"` | Input Nama Driver |
| `data-testid="inbound-item-qty"` | Input Qty Surat Jalan (draft item) |
| `data-testid="inbound-item-kondisi"` | Select Kondisi (draft item) |
| `data-testid="inbound-add-item"` | Tombol "Tambah ke Daftar" |
| `data-testid="inbound-submit"` | Tombol "Simpan & Proses Putaway" |
| `data-testid="inbound-confirm-save"` | Tombol "Konfirmasi & Simpan" (modal preview) |
| `data-testid="inbound-success-ok"` | Tombol "OK" (modal sukses) |

`data-testid` bersifat inert (tidak memengaruhi styling atau perilaku aplikasi).

---

## 8. Rekomendasi Perbaikan

### 8.1 Prioritas Tinggi (iterasi pengujian berikutnya)

1. **Otomasi alur Outbound & Approval (E2E-03/E2E-04)** — modul bisnis paling kritis setelah inbound: create outbound → supervisor approve/reject → delivery status (`sedang_dikirim` → `tiba_menunggu_konfirmasi` → `diterima_didistribusikan`) → verifikasi ledger stok. Direkomendasikan dengan `data-testid` pada form outbound & tombol approval.
2. **Otomasi transisi status Inbound (INB-04 s/d INB-07)** — receive inbound (qty diterima/ditolak) dan putaway ke zona, termasuk verifikasi mutasi `stok_ledger` via API.
3. **Eksekusi test di CI** — tambahkan job Playwright (headless) dengan database seed terpisah agar suite bisa berjalan otomatis setiap PR.

### 8.2 Prioritas Sedang

4. **Ambil OBS-03 (RBAC terpusat)** — pindahkan pemeriksaan role ke `ProtectedRoute` berbasis peta route→role.
5. **Ambil OBS-01 (aksesibilitas sidebar)** — tambahkan `aria-label` pada link icon-only.
6. **Tambah fixture Excel** untuk mengotomasi modul Rekonsiliasi (RECON-01 s/d RECON-06) termasuk negative upload (format salah, kolom rusak, file kosong).

### 8.3 Prioritas Rendah

7. Standarkan envelope response API (OBS-04).
8. Pertimbangkan pesan validasi terlokalisasi untuk format email (OBS-02).

---

## 9. Artefak & Cara Menjalankan

```
docs/
  test-plan.md              # Test plan lengkap (scope, strategi, kriteria)
  blackbox-test-cases.md    # 68 kasus blackbox (EP, BVA, DT, ST, EG)
  e2e-scenarios.md          # Skenario E2E + traceability matrix
  test-report.md            # Laporan ini
tests/
  e2e/                      # Skenario E2E (user journey)
  blackbox/                 # Blackbox UI + API contracts
  pages/                    # Page Object Model
  fixtures/                 # Test data + fixture (ui-fixtures)
  utils/                    # Helpers (session, API, evidence, master data)
playwright.config.ts        # Konfigurasi Playwright
test-results/evidence/      # Screenshot bukti skenario kritis
playwright-report/          # HTML report
test-results/results.json   # Hasil mentah (JSON)
```

**Menjalankan test:**

```bash
npx playwright test                 # Semua test (33)
npm run test:e2e                    # Hanya E2E
npm run test:blackbox               # Hanya blackbox
npm run test:api                    # Hanya API contracts (cepat, ±1 detik)
npm run test:headed                 # Mode dengan browser terlihat
npm run test:report                 # Buka HTML report
```

**Prasyarat:** backend API aktif di `http://localhost:5000`, frontend aktif di `http://localhost:3000`, database seed dengan akun uji (admin/supervisor/staf).

---

## 10. Penutup

Kriteria keluar (*exit criteria*) yang relevan telah terpenuhi: seluruh skenario Critical (P0) dan High (P1) yang diotomasi lulus 100% pada dua run berturut-turut, tidak ada bug blocker/critical yang tidak terdokumentasi, dan seluruh temuan dicatat terstruktur. Cakupan lanjutan untuk modul Outbound/Approval, transisi status Inbound, Rekonsiliasi, dan Laporan direkomendasikan sebagai iterasi berikutnya dengan prioritas sebagaimana tercantum di Bagian 8.
