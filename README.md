# Digitak Warehouse

Sistem manajemen gudang internal **Digitak Studio** untuk proses inbound, outbound, putaway, delivery, BOQ, rekonsiliasi, return, dan approval.

| Bagian | Isi |
| --- | --- |
| **Backend** | Express.js, Prisma ORM, PostgreSQL |
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| **Autentikasi** | JWT (access + refresh token), RBAC, scope gudang |
| **Peran** | Admin, Supervisor, Staf Gudang |

## Daftar Isi

1. [Arsitektur Sistem](#1-arsitektur-sistem)
2. [Instalasi & Variabel Lingkungan](#2-instalasi--variabel-lingkungan)
3. [Dokumentasi API](#3-dokumentasi-api)
4. [Panduan Pengguna](#4-panduan-pengguna)
5. [Materi Pelatihan Singkat](#5-materi-pelatihan-singkat)
6. [Kebijakan Privasi](#6-kebijakan-privasi)
7. [Syarat Penggunaan](#7-syarat-penggunaan)
8. [Kontak](#kontak)

---

## 1. Arsitektur Sistem

Arsitektur terpisah: frontend Next.js (`localhost:3000`) memanggil REST API Express (`localhost:5000`) yang terhubung ke PostgreSQL `digitak_warehouse` via Prisma.

### Struktur Backend (`backend/`)

- `src/server.js`: entry point, koneksi Prisma, `app.listen()` di PORT (default 5000).
- `src/app.js`: CORS whitelist, JSON parser, cookie-parser, morgan, static `/uploads`, security headers, health check, register route, error handler.
- `src/config/`: `env.js` (validasi env), `prisma.js` (singleton client).
- `src/middlewares/`: auth, role, validation (Zod), gudang-scope, require-password-change, rate-limit, error.
- `src/modules/`: per fitur (routes, controller, service, repository, validation, mapper, test): auth, users, warehouse, surat-jalan, boq, cluster, permintaan-boq, reconciliation, reports, notifications, settings, additional, return, capacity, dll.
- `src/shared/`: response, errors (`AppError`), password (bcrypt), logger. `src/utils/`: audit-log.
- `prisma/`: schema, migrations, seed.

### Struktur Frontend (`frontend/`)

- `app/`: routing App Router (dashboard, staff, master-data, notifications, profile, forgot/reset-password).
- `lib/`: `auth-context.tsx`, `permissions.ts`, `navigation.ts`, `api.ts`.
- `components/`, `hooks/`, `public/`, `mocks/`.

### Autentikasi

- **Login** `POST /api/auth/login`: verifikasi bcrypt, access token (default 60 menit) dan refresh token (default 3 hari, hash SHA256 disimpan di DB). Gagal login dicatat di audit log.
- **Refresh**: rotasi token, token lama di-revoke.
- **Logout**: revoke satu atau semua refresh token.
- **Change password**: mencabut semua refresh token aktif. **Forgot/Reset**: pesan generik, rate limited.
- Jika `must_change_password=true`, request selain path yang dikecualikan ditolak 403 `MUST_CHANGE_PASSWORD`.

### Otorisasi (RBAC)

Role `admin_general`, `supervisor`, `staf_gudang` dipetakan ke ADMIN, SUPERVISOR, STAFF. Role tidak cocok menghasilkan 403 dan tercatat di audit log. Middleware `gudang-scope` membatasi data per gudang berdasarkan relasi `user_gudang`.

### Entitas Utama

`user_account`, `refresh_token`, `personil`, `gudang`, `user_gudang`, `project`, `cluster`, `zona_gudang`, `barang`, `category`, `unit`, `boq`, `boq_item`, `surat_jalan`, `surat_jalan_item`, `stok_gudang`, `stok_ledger`, `audit_log`, `approval_log`.

### Alur Transaksi Inti

1. Pembuatan surat jalan (`POST /api/surat-jalan`, ADMIN/STAFF).
2. Approval outbound oleh supervisor (`PUT /:id/approve-outbound`).
3. Penerimaan inbound (`POST /:id/receive-inbound`): update qty diterima, status, `stok_gudang`, dan `stok_ledger` mutasi masuk.
4. Putaway dan retrieve antar zona.
5. Distribusi: mutasi keluar, status, dan audit log.
6. BOQ dan Permintaan BOQ (draft, aktif, ditolak; top_down/bottom_up).
7. Rekonsiliasi dengan catatan `reconciliation_remains_note`.

---

## 2. Instalasi & Variabel Lingkungan

**Prasyarat:** Node.js ≥ 18, PostgreSQL ≥ 14, npm, Git, Prisma CLI (via npx).

### Langkah Instalasi Lokal

```bash
git clone https://github.com/Ardialfarisi23/Digitak-Warehouse.git
cd Digitak-Warehouse/backend
npm install
```

Buat `backend/.env` (dari `.env.example`):

```env
DATABASE_URL=postgresql://username:password@localhost:5432/digitak_warehouse?schema=public
JWT_SECRET=change-me-to-a-long-random-string
JWT_REFRESH_SECRET=change-me-to-another-long-random-string
PORT=5000
NODE_ENV=development
```

Siapkan database lalu jalankan Prisma, seed (opsional), dan server:

```bash
psql -U postgres -c "CREATE DATABASE digitak_warehouse;"
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev        # http://localhost:5000
```

Terminal baru untuk frontend:

```bash
cd frontend
npm install
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev        # http://localhost:3000
```

Buka `http://localhost:3000` dan login dengan akun hasil seed.

### Variabel Lingkungan Backend

| Nama | Status | Fungsi / Default |
| --- | --- | --- |
| `DATABASE_URL` | Wajib | Koneksi PostgreSQL untuk Prisma |
| `JWT_SECRET` | Wajib | Secret access token |
| `JWT_REFRESH_SECRET` | Wajib | Secret refresh token |
| `JWT_ACCESS_EXPIRES` | Opsional | Default 60m |
| `JWT_REFRESH_EXPIRES` | Opsional | Default 3d |
| `PORT` / `NODE_ENV` | Opsional | Default 5000 / development |
| `FRONTEND_URL`, `TRUST_PROXY` | Opsional | URL frontend, trust proxy Express |
| `SEED_DEFAULT_PASSWORD` | Dev saja | Jangan dipakai di produksi |
| `LONGGAR_*_LIMIT` / `_WINDOW` | Opsional | Rate limit login (20/15), reset password (10/15), refresh (60/15), upload (60/15), delete (60/15) |

Frontend: `NEXT_PUBLIC_API_URL` (wajib pada dev).

> [!NOTE]
> Daftar `allowedOrigins` di `backend/src/app.js` bersifat hardcoded. Untuk produksi, tambahkan domain frontend ke whitelist.

### Perintah Penting

- **Backend:** `npm run dev`, `npm start`, `npm run seed`, `npm test`, `npm run verify:picking`.
- **Frontend:** `npm run dev`, `build`, `start`, `lint`, `test`, `test:e2e`.
- **Prisma:** `generate`, `migrate dev`, `migrate deploy`, `studio`, `migrate reset`.

### Deployment Produksi

- Belum ada Docker/Compose siap pakai.
- Backend: `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm start` dengan `NODE_ENV=production` dan secret JWT kuat yang berbeda.
- Frontend: `npm run build` lalu `npm start`; set `NEXT_PUBLIC_API_URL` ke backend produksi dan sesuaikan `images.remotePatterns`.
- `backend/src/uploads/` harus persisten (volume). Jangan commit `.env`.

### Troubleshooting

| Masalah | Solusi |
| --- | --- |
| Koneksi DB gagal | Cek `DATABASE_URL`, PostgreSQL berjalan, database ada, coba `prisma migrate dev`. |
| Prisma Client belum ter-generate | `npx prisma generate`; bila perlu hapus `node_modules/.prisma` dan install ulang. |
| JWT 401 | Pastikan secret konsisten, bersihkan localStorage, login ulang. |
| CORS blocked | Tambahkan origin frontend ke `allowedOrigins`. |
| `NEXT_PUBLIC_API_URL` tidak terbaca | Buat `.env.local` dan restart dev server. |

---

## 3. Dokumentasi API

Header autentikasi: `Authorization: Bearer <access_token>`. Respons sukses berbentuk `success=true` dengan `data`.

### Auth

| Endpoint | Akses | Fungsi | Body |
| --- | --- | --- | --- |
| `POST /api/auth/login` | Publik, loginLimiter | Login; mengembalikan `user`, `token`, `refreshToken` | email, password |
| `POST /api/auth/forgot-password` | Publik, rate limited | Minta reset password (respons generik) | email |
| `POST /api/auth/reset-password` | Publik, rate limited | Reset dengan token | email, token, newPassword |
| `PUT /api/auth/change-password` | Login | Ubah password, cabut semua refresh token | currentPassword, newPassword, refreshToken (opsional) |
| `POST /api/auth/refresh` | Publik, refreshLimiter | Rotasi token | refreshToken |
| `POST /api/auth/logout` | Login | Revoke refresh token | refreshToken (opsional) |
| `GET /api/auth/me` | Login | Data user dari token | - |
| `GET /api/auth/admin` | ADMIN | Endpoint uji otorisasi | - |

Kode error umum: `400`, `401`, `403`, `404`, `429`.

### Users

| Endpoint | Akses | Fungsi |
| --- | --- | --- |
| `PATCH /api/users/me/avatar` | Login | Ubah foto profil (multipart, field `avatar`, maks 2MB, jpg/jpeg/png/webp) |
| `DELETE /api/users/me/avatar` | Login | Hapus foto profil |
| `POST /api/users` | ADMIN | Buat user (otomatis membuat personil dan PIC gudang) |
| `GET /api/users` | ADMIN | Daftar user dengan pagination, search, sort |
| `GET /api/users/:user_id` | ADMIN | Detail user |
| `PUT /api/users/:user_id` | ADMIN | Ubah user; password diubah berarti refresh token dicabut; tidak boleh menonaktifkan akun sendiri |
| `POST /api/users/:user_id/reset-link` | ADMIN, rate limited | Buat link reset password; respons `{ resetUrl, expires }` |

#### Parameter `POST /api/users`

- `nama` (wajib, 3-100 karakter), `email` (wajib), `password` (wajib, kuat), `role` (`admin_general` | `supervisor` | `staf_gudang`).
- Opsional: `is_aktif`, `no_telepon`, `personil_id`. `gudang_id` wajib untuk `staf_gudang`.

#### Query `GET /api/users`

`page` (1), `limit` (10), `search`, `sortBy` (user_id, nama, email, role, is_aktif, created_at, updated_at; default updated_at), `sortOrder` (asc/desc; default desc), `include_inactive` (false). Respons: `data` dan `meta { total, page, limit, totalPages }`.

---

## 4. Panduan Pengguna

| Peran | Hak akses |
| --- | --- |
| **Admin** | Master data, pengguna, gudang, BOQ, surat jalan, rekonsiliasi, laporan, pengaturan. |
| **Supervisor** | Approval, pemantauan stok dan distribusi, operasional sesuai wewenang. |
| **Staf Gudang** | Inbound, outbound, putaway, tugas harian, riwayat. |

### Login dan Kata Sandi

1. Buka halaman login, isi email dan kata sandi, tekan **Masuk**.
2. Ganti kata sandi: menu Profil, isi sandi lama dan baru, konfirmasi, **Simpan**.
3. Lupa kata sandi: klik **Lupa kata sandi?**, masukkan email, ikuti petunjuk. Jika tidak ada instruksi, hubungi Admin.

### Fitur per Peran

- **Admin:** Dashboard, Master Data (barang, kategori, satuan, gudang, zona, rak, aisle, titik lapangan, proyek, cluster, supplier, pelanggan, kendaraan, personil, pengguna), Cluster dan BOQ, Surat Jalan, Gudang dan Layout, Rekonsiliasi, Laporan dan Audit, Manajemen Pengguna.
- **Supervisor:** Dashboard, Approval, Cluster dan BOQ, Utilisasi Gudang, Data Operasional dan Tim, Master Data (terbatas), Rekonsiliasi dan Area.
- **Staf Gudang:** Tugas Saya, Surat Jalan Outbound (picking dan distribusi), Penerimaan Inbound (jumlah dan kondisi), Lokasi dan Rak (putaway).

### FAQ

- **Menu tidak bisa diakses?** Menu disesuaikan peran; hubungi Admin.
- **Tombol simpan tidak aktif?** Pastikan semua kolom wajib terisi benar.
- **Data tidak muncul setelah filter?** Ubah atau hapus kriteria filter.
- **Siapa mengelola pengguna?** Hanya Admin.
- **Laporan stok?** Admin/Supervisor di Laporan dan Audit atau Rekonsiliasi.

### Pesan Error Umum

| Pesan | Solusi |
| --- | --- |
| Email atau kata sandi salah | Periksa kembali. |
| Akun Anda telah dinonaktifkan | Hubungi Admin. |
| Anda tidak memiliki hak akses | Gunakan menu sesuai peran atau hubungi Admin. |
| Token tidak ditemukan / Sesi berakhir | Login kembali. |
| Anda wajib mengganti kata sandi | Ganti kata sandi, lalu lanjutkan. |
| Tidak dapat terhubung ke server | Periksa internet, muat ulang. |
| Terlalu banyak percobaan | Tunggu sebentar, coba lagi. |

---

## 5. Materi Pelatihan Singkat

### Agenda (70-90 menit)

| Sesi | Waktu | Materi |
| --- | --- | --- |
| 1. Pembukaan | 5-10 mnt | Pengantar sistem dan peran |
| 2. Peran, login, keamanan | 10 mnt | Login, ganti/reset password, error umum |
| 3. Fitur per peran | 30-40 mnt | Latihan berkelompok |
| 4. Skenario mandiri | 15-20 mnt | Praktik per peran |
| 5. Kuis | 5-10 mnt | Evaluasi dan pembahasan |
| 6. Penutup | 5 mnt | Checklist dan Q&A |

### Skenario Latihan

- **Staf (A1-A4):** lihat Tugas Saya; catat penerimaan inbound; picking dan distribusi outbound; putaway ke zona/rak.
- **Supervisor (B1-B4):** dashboard dan approval (setujui/tolak dengan alasan); utilisasi gudang; rekonsiliasi dan area; data operasional dan tim.
- **Admin (C1-C4):** dashboard dan master data; cluster dan BOQ; surat jalan, gudang dan layout; rekonsiliasi, laporan, manajemen pengguna.

### Checklist Kesiapan Go-Live

- [ ] **Umum:** login/logout, ganti dan reset password, memahami error umum dan hak akses peran.
- [ ] **Staf:** melihat tugas, inbound (jumlah dan kondisi), outbound, putaway, riwayat.
- [ ] **Supervisor:** dashboard dan approval, utilisasi gudang, rekonsiliasi dan area, data operasional.
- [ ] **Admin:** master data, cluster dan BOQ, surat jalan dan layout, rekonsiliasi dan laporan, manajemen pengguna.

### Kuis Singkat

<details>
<summary>Lihat pertanyaan dan jawaban</summary>

1. Siapa yang dapat mengubah peran pengguna? **Admin**
2. Menu Staf untuk tugas harian? **Tugas Saya**
3. Kapan Supervisor memakai Approval? **Saat ada permohonan menunggu persetujuan**
4. Putaway dilakukan oleh? **Staf Gudang**
5. Laporan dan Audit diakses oleh? **Admin dan Supervisor**
6. Langkah pertama saat lupa sandi? **Klik Lupa kata sandi? di halaman login**
7. Wajib diisi saat inbound? **Jumlah diterima dan kondisi barang**
8. Utilisasi Gudang paling relevan untuk? **Supervisor**
9. Cluster dan BOQ dikelola oleh? **Admin (dipantau Supervisor)**
10. Pesan tidak memiliki hak akses? **Gunakan menu sesuai peran atau hubungi Admin**

</details>

---

## 6. Kebijakan Privasi

> [!WARNING]
> **DRAF:** perlu ditinjau pihak hukum/manajemen sebelum dipublikasikan.

### 1. Data yang Dikumpulkan

| Data | Tujuan |
| --- | --- |
| Nama, email, no HP | Identifikasi, autentikasi, kontak operasional, audit |
| Alamat (gudang, titik lapangan, cluster, pelanggan, supplier) | Lokasi operasional |
| Foto (profil, kendaraan, barang) | Identifikasi visual |
| IP address dan user agent (`refresh_token`) | Keamanan sesi dan audit |
| Log audit dan approval | Jejak audit dan investigasi |
| Notifikasi dan preferensinya | Penyampaian notifikasi |
| Token reset password dan refresh token | Pemulihan akses dan manajemen sesi |

### 2. Dasar, Retensi, dan Akses

- Dasar: operasional gudang, autentikasi dan otorisasi, keamanan, audit, kepatuhan internal.
- Retensi: data akun selama aktif; refresh token hingga kedaluwarsa/dicabut; reset token hingga kedaluwarsa atau dipakai. **[ISI: periode retensi audit log, notifikasi, dan data transaksi]**
- Akses: Admin (luas), Supervisor (sesuai wewenang), Staf (terbatas tugas), dengan kontrol role dan scope gudang. **[ISI: pihak ketiga, jika ada]**

### 3. Keamanan Data

- Password di-hash bcrypt; refresh token disimpan ter-hash SHA256 dengan rotasi.
- Autentikasi JWT, RBAC, scope gudang, paksa ganti password.
- Rate limiting, validasi Zod, CORS whitelist, security headers dasar, audit logging.
- **[ISI: kebijakan backup, monitoring, incident response]**

### 4. Hak Pengguna (UU No. 27 Tahun 2022 tentang PDP)

Hak atas informasi, akses, perbaikan, penghapusan (dengan mempertimbangkan retensi hukum), pembatasan pemrosesan, keberatan, portabilitas, penarikan persetujuan, dan pengaduan ke otoritas PDP.

Kontak koordinator PDP: **[ISI: nama, email, telepon, unit kerja]**

### 5. Penutup

Kebijakan dapat diperbarui sewaktu-waktu dan diinformasikan melalui saluran resmi organisasi.

---

## 7. Syarat Penggunaan

> [!WARNING]
> **DRAF:** perlu ditinjau pihak hukum/manajemen sebelum dipublikasikan.

### 1. Ruang Lingkup Layanan

Sistem Digitak Warehouse adalah aplikasi web untuk mengelola operasional gudang internal. Layanan ditujukan untuk penggunaan internal **[ISI: Nama Organisasi]** dan hanya boleh digunakan pengguna terdaftar sesuai perannya.

### 2. Kewajiban Pengguna

- Menggunakan Sistem sesuai peran dan wewenang.
- Menjaga kerahasiaan kredensial dan memakai kata sandi yang kuat tanpa membagikannya.
- Segera melapor ke Admin jika akun diduga disalahgunakan.
- Memasukkan data yang benar, akurat, dan terkini.
- Mengikuti prosedur organisasi dan hukum yang berlaku.

### 3. Larangan

- Mengakses bagian Sistem di luar wewenang.
- Menyalin atau memanfaatkan data Sistem di luar kepentingan operasional tanpa izin tertulis.
- Peretasan, injeksi, atau tindakan yang merusak/mengganggu Sistem.
- Mencoba mengakses akun orang lain secara tidak sah.
- Menyebarkan malware atau kode berbahaya.
- Tindakan lain yang merugikan organisasi, pengguna lain, atau integritas data.

### 4. Tanggung Jawab Akun

- Akun hanya boleh digunakan pemilik sah, yang bertanggung jawab atas seluruh aktivitas akunnya.
- Pengguna wajib menjaga keamanan perangkat yang dipakai.
- Jika terjadi pelanggaran, organisasi berhak menonaktifkan akun sementara atau permanen.

### 5. Pembatasan Tanggung Jawab

Sistem disediakan “sebagaimana adanya”. Organisasi tidak bertanggung jawab atas kerugian akibat penggunaan di luar prosedur, gangguan force majeure (bencana alam, gangguan jaringan provider), kehilangan data akibat kelalaian pengguna menjaga kredensial atau prosedur, serta penggunaan tidak sah oleh pihak ketiga akibat kelalaian pengguna.

### 6. Perubahan Ketentuan

Organisasi berhak mengubah ketentuan sewaktu-waktu melalui saluran resmi. Pengguna dianggap menyetujui dengan tetap menggunakan Sistem setelah perubahan diumumkan.

---

## Kontak

**Bapak Apriadi**
PT Metanouva Informatika (Digitak Studio)
Email: [info@digitak.id](mailto:info@digitak.id)
Telepon: +62 877-8052-3063
