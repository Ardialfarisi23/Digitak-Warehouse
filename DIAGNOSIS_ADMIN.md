# DIAGNOSIS_ADMIN — TAHAP 1 (DIAGNOSA SAJA) & TAHAP 2/3 (IMPLEMENTASI)

Project: digitak-warehouse. Halaman Admin.

**PERINGAT PENTING (state lingkungan):** File ini dan beberapa edit kode yang dilakukan dalam sesi sebelumnya tidak ter-pertahankan di disk antar-turn (working directory direset). Edit kode untuk Task 4, 5, dan 7 telah diaplikasikan ulang dalam turn ini (lihat PROGRES di bawah). File ini adalah sumber kebenaran dari diagnosis dan progres.

---

## [4] MANAJEMEN PENGGUNA (Admin General)

### [4.a] Akun nonaktif HILANG dari tabel user

**(a) File + baris relevan**
- `frontend/app/dashboard/users/page.tsx`
  - `fetchUsers` panggil `GET /api/users?page=1&limit=100` tanpa parameter `include_inactive`.
  - `toggleStatus` pakai `PUT /api/users/:id` dengan body `{ is_aktif: !record.is_aktif }` — soft toggle, BUKAN hard delete.
  - UI aktifkan kembali sudah ada: tombol `UserCheck` dengan aria-label "Aktifkan akun" saat `!record.is_aktif`.
- `backend/src/modules/users/users.repository.js`
  - `findAll`: default `where.is_aktif = true` kecuali `include_inactive === "true"`. Sebab akun nonaktif hilang dari tabel — backend saring default aktif saja.

**(b) Akar masalah / kondisi saat ini**
Frontend tidak menyertakan `include_inactive=true`, sementara backend `findAll` secara default hanya mengembalikan `user_account.is_aktif = true`. Akun yang dinonaktifkan (soft toggle) tidak lagi dikirim ke frontend. Logika nonaktifkan sudah soft, dan UI "Aktifkan akun" sudah ada.

**(c) Rencana perubahan (maks 5 poin)**
1. Frontend `fetchUsers` tambahkan query param `include_inactive=true`.
2. Pastikan tombol nonaktifkan/aktifkan kembali tetap memanggil `PUT /api/users/:id { is_aktif }` (tidak perlu ubah backend, sudah soft toggle).
3. Opsional: tambahkan filter status (Aktif/Nonaktif/Semua) di halaman pengguna.
4. Pastikan paginated table + mobile card menampilkan badge "Nonaktif" untuk `is_aktif=false` (sudah ada).
5. Setelah diaktifkan kembali, data difetch ulang atau di-update optimistically di state lokal.

**(d) Risiko / dependensi**
- Tidak ada perubahan skema DB. `is_aktif` kolom sudah ada di `user_account`.

---

### [4.b] Status tidak sinkron: User vs Personil

**(a) File + baris relevan**
- `backend/src/modules/users/users.repository.js`
  - `formatUser`: `is_aktif` diambil dari `user_account`; personil adalah relasi terpisah.
  - `update`: transaksi update `user_account` + sync personil (nama, email, no_hp, posisi, gudang_id) tapi **tidak sync `personil.is_aktif`**.
- `backend/src/modules/personnel/personnel.repository.js`
  - `findAll`: `personil.is_aktif` default `true` kecuali `is_aktif="false"` dikirim secara eksplisit.
- `frontend/app/master-data/page.tsx`
  - Tab Personil kolom `is_aktif`, render badge status baca `record.is_aktif`. Data dari `GET /api/personnels`.

**(b) Akar masalah / kondisi saat ini**
`user_account.is_aktif` dan `personil.is_aktif` adalah dua field di dua tabel yang berbeda. Menonaktifkan akun via Manajemen Pengguna hanya set `user_account.is_aktif = false`; `personil.is_aktif` tetap `true`. Karena Master Data Personil baca status dari `personil.is_aktif`, akun tetap tampil "Aktif" di sana.

**(c) Rencana perubahan (maks 5 poin)**
1. Tentukan single source of truth: `user_account.is_aktif` (sumber otorisasi login), atau sinkronkan kedua-duanya.
2. Saat toggle status user (`PUT /api/users/:id { is_aktif }`), dalam satu `prisma.$transaction` juga update `personil.is_aktif` ke nilai yang sama.
3. Atau, di `GET /api/personnels`, gabungkan kondisi status agar personil milik user nonaktif ikut tampil sebagai Nonaktif.
4. Tambahkan audit log saat status berubah.
5. Uji pada akun contoh "Ardi".

**(d) Risiko / dependensi**
- Tabel `personil` dan `user_account` terhubung via `personil.user_id` → `user_account.user_id`.
- Beberapa personil mungkin tidak punya user_account (orphan).

---

## [5] MASTER DATA BARANG — modal detail "Riwayat Perubahan" tampil "oleh 4"

**(a) File + baris relevan**
- `frontend/app/master-data/page.tsx`
  - `DetailModal` bagian Riwayat Perubahan: `oleh ${(record).created_by}` (ID mentah angka), bukan nama user.
- `backend/src/modules/item/item.repository.js`
  - `findAll`/`findByKode`: tidak include `creator`/`updater` user relations.
- `backend/prisma/schema.prisma`: model `Barang` punya relasi `creator` dan `updater` ke `user_account` via field `created_by` / `updated_by`.

**(b) Akar masalah / kondisi saat ini**
API detail barang tidak menyertakan relasi user (`creator`/`updater`), jadi frontend hanya punya ID angka dan menampilkannya mentah.

**(c) Rencana perubahan (maks 5 poin)**
1. Backend `findByKode` (detail barang) tambahkan `include: { creator: { select: { nama: true } }, updater: { select: { nama: true } } }`.
2. Opsional pula `findAll` agar daftar barang juga siap menampilkan pembuat/penubah.
3. Frontend `DetailModal` ganti `oleh ${created_by}` menjadi `oleh ${creator?.nama ?? "-"}`; sama untuk `updated_by`/`updater`.
4. Fallback jika user sudah dihapus/null: tampilkan "-" alih-ansi ID mentah.
5. Pertimbangkan format kolom jadi "Dibuat oleh <nama> pada <tanggal>".

**(d) Risiko / dependensi**
- Relasi `creator`/`updater` sudah ada di Prisma, hanya perlu `include` di query.
- Jika user yang membuat/mengubah sudah dihapus, relasi Prisma akan null → diperlukan fallback.

---

## [6] SURAT JALAN INBOUND — detail Admin harus sama layout 2 kolom seperti supervisor

**(a) File + baris relevan**
- Referensi: `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx` — layout 2 kolom `lg:grid-cols-2`, kiri dokumen lampiran, kanan info transaksi + tabel barang.
- Komponen shared: `frontend/components/surat-jalan/DetailSuratJalanDocument.tsx` (tampilan dokumen cetak, bukan layout 2 kolom + preview).
- API detail: `GET /api/surat-jalan/:id` mengembalikan `surat_jalan_url`/`document_url`/`attachment` dan `items`.

**(b) Akar masalah / kondisi saat ini**
Halaman supervisor inbound detail sudah ada dengan layout target, tapi sisi Admin belum punya modal detail inbound yang sama.

**(c) Rencana perubahan (maks 5 poin)**
1. Konfirmasi apakah Admin sudah punya halaman inbound list dengan tombol detail.
2. Evaluasi penggunaan ulang `DetailSuratJalanDocument` atau ekstrak komponen shared (preview dokumen + tabel item barang).
3. Buat modal detail inbound Admin dengan layout 2 kolom.
4. Pastikan API Admin `GET /api/surat-jalan/:id` mengembalikan dokumen upload dan items.
5. Fallback jika belum ada dokumen upload.

**(d) Risiko / dependensi**
- Upload URL bisa berupa data URL (base64) atau file URL; perlu normalisasi.

---

## [7] REKONSILIASI — filter Project dropdown hanya 1 pilihan

**(a) File + baris relevan**
- `frontend/app/dashboard/reconciliation/page.tsx`
  - `FILTER_OPTIONS_ENDPOINT = /api/reconciliation/filter-options` (baris 44-45).
  - `fetchFilterOptions` (baris 387-402): `setFilterOptions(json?.data ?? { projects: [] })`.
  - `projectOptions` (baris 346-365): jalur utama memetakan `filterOptions.projects` tanpa dedupe.
- `backend/src/modules/reconciliation/reconciliation.service.js`
  - `getFilterOptions` (baris 34-85): query project dengan clusters.boqs status [draft, aktif, selesai] dan source "top_down".

**(b) Akar masalah / kondisi saat ini**
Opsi filter Project berasal dari endpoint `/api/reconciliation/filter-options`. Jika dropdown hanya menampilkan 1 project, kemungkinan endpoint hanya mengembalikan 1 project atau frontend dedupe.

**(c) Rencana perubahan (maks 5 poin)**
1. Baca backend route/controller untuk `GET /api/reconciliation/filter-options` dan cek query.
2. Verifikasi apakah endpoint mengembalikan semua project aktif.
3. Jika opsi diambil dari data terfilter, ganti sumbernya menjadi semua project dari endpoint.
4. Pastikan endpoint tidak menggunakan pagination/limit yang memotong daftar project.
5. Pengujian: buka halaman rekonasi, pastikan dropdown Project menunjukkan semua project.

**(d) Risiko / dependensi**
- Endpoint filter-options mungkin juga dipakai komponen lain.

---

## [8] AUDIT LOG (tab Audit Log) — tambah filter Rentang Tanggal, filter Role, tombol Ekspor

**(a) File + baris relevan**
- `frontend/app/dashboard/reports/page.tsx` — `TabAuditLog` (baris 228-~790). State `actorRole`, `startDate`, `endDate`, `exporting` sudah ada. `fetchData` dan `handleExportAuditLog` sudah mengirim parameter filter dan memanggil export. **Tetapi JSX yang di-return tidak merender toolbar filter dan tombol Ekspor.**
- `backend/src/modules/reports/reports.routes.js` baris 11-12: `GET /api/reports/audit-log` dan `GET /api/reports/audit-log/export`.
- `backend/src/modules/reports/reports.repository.js`: `getAuditLogs` dan `getAuditLogForExport` mendukung filter role/tanggal dan mengambil semua data (EXPORT_LIMIT 10000).

**(b) Akar masalah / kondisi saat ini**
Backend dan logika fetch/export sudah mendukung filter rentang tanggal, role, dan ekspor. Namun di sisi UI `TabAuditLog`, toolbar filter dan tombol Ekspor belum dirender.

**(c) Rencana perubahan (maks 5 poin)**
1. Tambahkan toolbar filter di `TabAuditLog`: input `type="date"` untuk `startDate`/`endDate` dan `select` untuk `actorRole`.
2. Tambahkan tombol "Ekspor" yang memanggil `handleExportAuditLog`.
3. Pastikan ekspor mengikuti filter aktif dan mengambil semua data (bukan hanya halaman saat ini).
4. Tampilkan peringatan jika data terpotong.

**(d) Risiko / dependensi**
- Library `ExcelJS` sudah terpasang. Endpoint audit-log/export hanya boleh diakses role ADMIN.

---

## Ringkasan file yang akan diubah (estimasi)

| Task | File (frontend) | File (backend) |
|------|-----------------|----------------|
| [4.a] | `frontend/app/dashboard/users/page.tsx` | `backend/src/modules/users/users.repository.js` (opsional) |
| [4.b] | `frontend/app/master-data/page.tsx` (opsional) | `backend/src/modules/users/users.repository.js`, `backend/src/modules/personnel/personnel.repository.js` |
| [5] | `frontend/app/master-data/page.tsx` | `backend/src/modules/item/item.repository.js` |
| [6] | `frontend/components/surat-jalan/DetailSuratJalanDocument.tsx`, modal baru Admin | — |
| [7] | `frontend/app/dashboard/reconciliation/page.tsx` | `backend/src/modules/reconciliation/*` |
| [8] | `frontend/app/dashboard/reports/page.tsx` (`TabAuditLog`) | `backend/src/modules/reports/reports.repository.js` (verifikasi saja) |

---

## Temuan yang saling terkait antar task

- **User ↔ Personil**: `[4.a]` dan `[4.b]` berbagi `users.repository.js` `update`.
- **Barang detail relasi user**: `[5]` butuh include `creator`/`updater` ke `user_account`, pola yang sama dengan audit log.
- **Surat jalan detail**: `[6]` merujuk API `GET /api/surat-jalan/:id` dan komponen `DetailSuratJalanDocument` yang juga digunakan halaman delivery/supervisor.
- **Audit log role**: `[8]` butuh join `user_account.role` untuk filter role.
- **Rekon filter project**: `[7]` tergantung endpoint `/api/reconciliation/filter-options`.

---

## Pertanyaan / keputusan yang perlu dijawab sebelum implementasi

1. **[4.a]** Apakah parameter query untuk menampilkan nonaktif harusnya `include_inactive=true`? Apakah ingin tambah filter status UI?
2. **[4.b]** Single source of truth status: `user_account.is_aktif` atau `personil.is_aktif`? Apakah personil tanpa user_account tetap boleh memiliki status sendiri?
3. **[5]** Apakah include `creator`/`updater` hanya di detail barang atau juga di daftar?
4. **[6]** Apakah Admin sudah punya halaman inbound list dengan tombol detail, atau perlu membuat modal baru?
5. **[7]** (DIAGNOSI LANJUT — lihat PROGRES TAHAP 3 di bawah)
6. **[8]** Opsi role untuk filter role diambil dari mana? Apakah tombol Ekspor ditempatkan di toolbar samping search/tanggal?

---

## PROGRES TAHAP 2 (IMPLEMENTASI TASK 4)

Status: SELESAI — tidak ada file kode di luar task 4 yang diubah. Edit kode telah diaplikasikan ulang dalam turn ini.

### [4.a] Akun nonaktif tetap tampil + aktifkan kembali
**File diubah:**
- `frontend/app/dashboard/users/page.tsx`
  - `fetchUsers` sekarang kirim `include_inactive=true`.
  - State `statusFilter` (`all`/`aktif`/`nonaktif`, default `all`) + dropdown filter status di toolbar.
  - `filteredUsers` filter menurut status + pencarian.
  - Baris nonaktif diberi styling `opacity-70` di tabel desktop; badge status sudah tampil.
- `backend/src/modules/users/users.controller.js`: `update` melewatkan `req.user.id` ke service.
- `backend/src/modules/users/users.service.js`: `update(user_id, data, actorId)` — menolak jika `is_aktif === false` dan `actorId === user_id` (AppError 400).
**Backend `include_inactive`:** sudah benar di `users.repository.js` `findAll` (membaca query param sebagai string `"true"`). Tidak perlu ubah.

### [4.b] Sinkron status User ↔ Personil
**File diubah:**
- `backend/src/modules/users/users.repository.js`: `update` (inside `$transaction`) — saat `userData.is_aktif` diubah, juga set `personil.is_aktif` ke nilai yang sama.
- `backend/src/modules/personnel/personnel.service.js`: `update` dibungkus `prisma.$transaction`; saat `personil.is_aktif` berubah dan personil punya `user_id`, juga update `user_account.is_aktif`.
**File baru:** `backend/scripts/sync-status-user-personil.sql` — query idempotent satu kali untuk menyamakan data lama. Dijalankan manual setelah review.
**Verifikasi alur:** Nonaktifkan user → tetap tampil (badge Nonaktif) → Aktifkan Kembali → personil ikut berubah (dua arah). Master Data Personil `onSuccess={fetchMasterData}` → data direfresh. Admin login tidak bisa menonaktifkan sendiri.
**Hasil verifikasi:** `node --check` 4 file backend → SYNTAX OK. `eslint` users/page.tsx → hanya error pre-existing, tidak ada baru.

---

## PROGRES TAHAP 3 (IMPLEMENTASI TASK 5 DAN 7)

### [5] MASTER DATA BARANG — nama user di Riwayat Perubahan (SELESAI)
**File diubah:**
- `backend/src/modules/item/item.repository.js`
  - `findByKode` (detail barang): ditambahkan `include: { creator: { select: { nama: true } }, updater: { select: { nama: true } } }` baik pada `findUnique` maupun `findFirst`. Hanya field `nama` yang diambil, tidak ada password/hash/token. Endpoint daftar (`findAll`) tidak diubah.
- `frontend/app/master-data/page.tsx`
  - `DetailModal` bagian Riwayat Perubahan: `oleh ${creator?.nama || "-"}` dan `oleh ${updater?.nama || "-"}`; fallback `"-"` jika relasi null / user dihapus / data lama tanpa created_by/updated_by. Tidak ada angka ID mentah yang ditampilkan.
**Verifikasi:** `node --check` item.repository.js → SYNTAX OK. `eslint` master-data page.tsx → hanya `no-explicit-any` yang sudah ada file-wide; tidak ada error baru.

### [7] REKONSILIASI — filter Project hanya 1 opsi (SELESAI, penelusuran akar masalah)
**Akar masalah:** TIDAK ditemukan bug kode / keterbatasan data.
- DB: 2 project total, keduanya `status_aktif=true`, dan keduanya memenuhi kriteria `getFilterOptions` → cocok jumlah yang diharapkan user (2 project).
- Backend `getFilterOptions` (`reconciliation.service.js:34-85`): mengembalikan 2 project dengan benar (diverifikasi langsung melalui pemanggilan service). Tidak ada `take/limit 1`, tidak hardcode.
- Frontend `projectOptions` (`reconciliation page.tsx:346-365`, render baris 995-999): jalur dropdown utama (`adjustmentRecord === null`) memetakan SEMUA `filterOptions.projects` tanpa dedupe → 2 opsi.
- Dedup hanya ada di cabang `adjustmentRecord`/modal remains-note (baris 351-362), yang BUKAN dropdown filter utama.
**Kesimpulan:** Gejala "1 pilihan" tidak dapat direproduksi dari kode + DB saat ini (kemungkinan cache `.next` yang tidak ter-build ulang, atau pengguna mengamati cabang modal remains-note). Tidak ada perubahan kode yang diperlukan untuk task 7 saat ini.
**Keputusan yang diperlukan:** Konfirmasi apakah gejala masih muncul setelah build ulang (`rm -rf .next && next build` / `next dev` fresh). Jika masih 1 pilihan di environment target, perlu inspeksi langsung (build cache atau data DB yang berbeda).

---

## PROGRES TAHAP 4 (IMPLEMENTASI TASK 6)

Status: IN_PROGRESS

### [6] SURAT JALAN INBOUND — modal detail Admin, layout 2 kolom sama supervisor

**Temuan awal:**
- Tidak ada halaman inbound list untuk Admin di `frontend/app/dashboard/`. Hanya ada:
  - `frontend/app/dashboard/supervisor/approval/inbound/page.tsx` (list supervisor)
  - `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx` (detail supervisor, layout 2 kolom baris 399-668)
  - `frontend/app/staff/inbound/page.tsx` (list staf)
  - `frontend/app/staff/inbound/[suratJalanId]/page.tsx` (detail staf)
- Backend `GET /api/surat-jalan/:id` (`surat-jalan.service.js:802-851`) accessible oleh `admin_general` dan `supervisor`. Mengembalikan `surat_jalan_url`, `document_url`, `attachment`, `items` dengan label sudah di-resolve (nama_barang, kode_perangkat, satuan, kategori).
- Komponen `DetailSuratJalanDocument.tsx` adalah tampilan cetak, BUKAN layout 2 kolom. Tidak diubah.

**Rencana:**
1. Buat `frontend/components/surat-jalan/SuratJalanInboundDetailView.tsx` — komponen shared presentasi 2 kolom (kiri: dokumen, kanan: info transaksi + tabel barang), read-only, tanpa tombol approve/reject. Menerima `data` via props. ✅ SELESAI
2. Update `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx` — ganti inline 2-col layout dengan komponen shared, tanpa perubahan visual/perilaku. ✅ SELESAI (lint: 0 error baru, error setState-in-effect pre-existing)
3. Buat `frontend/app/dashboard/inbound/[id]/page.tsx` — halaman detail Admin read-only menggunakan komponen shared. (Tidak ada daftar inbound Admin; halaman detail diakses langsung via URL.) ✅ SELESAI
4. Backend: tidak perlu diubah — endpoint `findById` sudah mengembalikan data yang cukup dan role Admin diizinkan.
5. DetailSuratJalanDocument.tsx: TIDAK diubah (tetap sebagai tampilan cetak). ✅

**File yang diubah/dibuat:**
- `frontend/components/surat-jalan/SuratJalanInboundDetailView.tsx` (BARU) — komponen shared presentasi 2 kolom read-only dengan preview dokumen (PDF/img/placeholder) dan tabel barang.
- `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx` (DIUBAH) — ganti inline 2-col layout dengan `<SuratJalanInboundDetailView>`, hapus duplikasi preview modal, bersihkan import yang tidak dipakai. Halaman supervisor tetap identik visually.
- `frontend/app/dashboard/inbound/[id]/page.tsx` (BARU) — halaman detail Admin read-only, fetch `GET /api/surat-jalan/:id`, render `SuratJalanInboundDetailView`, tanpa tombol approve/reject.

**Backend:** Tidak perlu diubah. `GET /api/surat-jalan/:id` (`surat-jalan.service.js:802`) mengembalikan `surat_jalan_url`/`document_url`/`attachment` + `items` dengan label resolved, dan role `admin_general` diizinkan (baris 830).

**Lint/TypeScript:** Semua file 0 error. Supervisor page masih memiliki 1 error `setState-in-effect` yang pre-existing (tidak baru). DetailSuratJalanDocument.tsx tidak disentuh.

**Belum tuntas / perlu keputusan:**
- Tidak ada daftar inbound Admin (halaman list). Detail Admin diakses langsung via URL `/dashboard/inbound/:id`. Jika ingin ada tombol detail dari daftar Admin, perlu buat halaman list inbound Admin terlebih dahulu.

---

## PROGRES TAHAP 4B (HUBUNGKAN KOMPONEN SHARED KE MODAL ADMIN)

Status: SELESAI

**Perubahan:**
- `frontend/app/dashboard/delivery/page.tsx` (sudah diubah di sesi sebelumnya): modal detail Admin memakai `SuratJalanInboundDetailView`; trigger Eye, tutup modal, section Laporan Barang Sampai, Actions tetap dipertahankan.
- `frontend/app/dashboard/inbound/[id]/page.tsx` (DIHAPUS): halaman detail Admin read-only yang tidak ditautkan dari mana pun, sesuai TAHAP 4B.
- `DetailSuratJalanDocument.tsx` tidak disentuh.

**Lint/TypeScript:** File terkait reviewed; tidak ada perubahan baru.

**Keputusan:**
- Tidak diperlukan.


## PROGRES TAHAP 5 (IMPLEMENTASI TASK 8)
Selesai: toolbar filter tanggal/role/aksi/pencarian + reset + ekspor pada TabAuditLog. Backend tidak diubah. Format export xlsx.
