# E2E Test Scenarios & Traceability Matrix — Digitak Warehouse

> **Dokumen:** End-to-End (E2E) Test Journey & Traceability Matrix  
> **Aplikasi:** Digitak Warehouse  
> **Versi:** 1.0  
> **Target Environment:** Local Staging (`http://localhost:3000` & `http://localhost:5000`)  

---

## 1. Pendahuluan

Dokumen ini mendefinisikan skenario pengujian End-to-End (E2E) yang mensimulasikan perjalanan pengguna secara utuh (*end-to-end user journeys*) melintasi batasan peran (Admin General, Supervisor, dan Staf Gudang). Setiap skenario mendefinisikan kondisi awal (*preconditions*), kondisi akhir (*postconditions*), langkah-langkah detail, *assertions* eksplisit pada setiap tahapan, serta matriks ketertelusuran (*traceability matrix*) ke kasus uji blackbox terkait.

---

## 2. Skenario E2E Komprehensif

### E2E-01: Autentikasi Multi-Peran & Proteksi Batasan Akses (RBAC)

- **Deskripsi:** Verifikasi alur login untuk ketiga peran (Admin, Supervisor, Staff), pengalihan otomatis ke dashboard masing-masing, proteksi direct URL terhadap rute terlarang (akses tidak sah), dan siklus logout.
- **Precondition:**
  - Akun `admin@digitakgudang.com`, `budi.santoso@digitakgudang.com`, `fajar.hidayat@digitakgudang.com` aktif di database.
  - Browser berada dalam kondisi sesi bersih (tidak ada token di `localStorage`).
- **Postcondition:**
  - Sesi berhasil ditutup, storage bersih, pengguna kembali ke halaman root login.
- **Traceability:** `AUTH-01`, `AUTH-02`, `AUTH-03`, `AUTH-11`, `AUTH-12`, `RBAC-01`, `RBAC-02`, `RBAC-03`, `RBAC-05`, `RBAC-06`.

#### Langkah & Assertion E2E-01:
1. **Langkah 1 (Admin Login):**
   - Buka URL `http://localhost:3000/`.
   - Isi input `#email` dengan `admin@digitakgudang.com` dan `#password` dengan `admin123`.
   - Klik tombol submit "Masuk".
   - **Assertion:** URL browser berubah menjadi `http://localhost:3000/dashboard`, judul/heading menampilkan dashboard admin, dan token JWT tersimpan di `localStorage`.
2. **Langkah 2 (Admin Menu Verification):**
   - Periksa keberadaan menu sidebar.
   - **Assertion:** Menu "Master Data", "Gudang & Layout", "Surat Jalan", "Rekonsiliasi", "Laporan & Audit", dan "Manajemen Pengguna" tampil secara lengkap.
3. **Langkah 3 (Admin Logout):**
   - Buka menu dropdown profil pada header dan klik "Keluar".
   - **Assertion:** URL kembali ke `http://localhost:3000/`, `localStorage.getItem("token")` bernilai `null`.
4. **Langkah 4 (Supervisor Login & RBAC):**
   - Input kredensial `budi.santoso@digitakgudang.com` / `supervisor123`.
   - Klik "Masuk".
   - **Assertion:** URL dialihkan ke `http://localhost:3000/dashboard/supervisor`.
   - Coba akses URL Admin terlarang `http://localhost:3000/dashboard/users`.
   - **Assertion:** Sistem menolak akses dan mengembalikan pengguna ke dashboard yang berwenang.
5. **Langkah 5 (Supervisor Logout & Staff Login):**
   - Logout supervisor, login sebagai `fajar.hidayat@digitakgudang.com` / `fajar123`.
   - **Assertion:** URL dialihkan ke `http://localhost:3000/staff/dashboard`.
   - Coba akses URL Approval Supervisor `http://localhost:3000/dashboard/supervisor/approval`.
   - **Assertion:** Sistem menolak/mengalihkan akses ke `/staff/dashboard`.

---

### E2E-02: Siklus Penuh Inbound Material (Draft -> Penerimaan -> Putaway ke Rak Gudang)

- **Deskripsi:** Staf gudang menerima pengiriman material dari supplier, membuat dokumen Inbound Surat Jalan, melakukan verifikasi fisik (menerima barang baik dan mencatat barang rusak), lalu menempatkan (*putaway*) material ke zona rak gudang hingga stok ledger bertambah.
- **Precondition:**
  - Login sebagai Staf Gudang (`fajar.hidayat@digitakgudang.com`).
  - Master supplier, master barang, dan master gudang aktif tersedia di database.
- **Postcondition:**
  - Status Surat Jalan Inbound menjadi `selesai`.
  - Tabel `stok_gudang` pada zona terkait bertambah sesuai kuantitas yang di-putaway.
  - Record baru pada `stok_ledger` bertipe transaksi `IN`.
- **Traceability:** `INB-01`, `INB-04`, `INB-06`, `INB-08`, `MSTR-01`, `MSTR-08`.

#### Langkah & Assertion E2E-02:
1. **Langkah 1 (Navigasi ke Inbound):**
   - Klik menu "Penerimaan" (`/staff/inbound`).
   - **Assertion:** Halaman menampilkan daftar surat jalan inbound dan tombol pembuatan dokumen baru.
2. **Langkah 2 (Buat Draft Inbound):**
   - Klik "Buat Surat Jalan Inbound" (atau tombol tambah).
   - Isi No SJ fisik, pilih Supplier, pilih Gudang Tujuan, dan pilih 1 item barang dengan kuantitas 20.
   - Klik "Simpan Draft".
   - **Assertion:** Notifikasi sukses muncul, record baru muncul di tabel dengan status `draft_diajukan`.
3. **Langkah 3 (Pemeriksaan Fisik & Receive Inbound):**
   - Buka dokumen yang baru dibuat.
   - Klik aksi "Terima Barang" (Receive Inbound).
   - Masukkan Qty Diterima Baik = 18, Qty Ditolak/Rusak = 2, dengan alasan "Kabel terkelupas".
   - Konfirmasi penerimaan.
   - **Assertion:** Status surat jalan berubah menjadi `ready_putaway`.
4. **Langkah 4 (Putaway ke Zona Gudang):**
   - Buka modul Putaway (`/staff/putaway`).
   - Pilih barang yang berstatus `ready_putaway`.
   - Tentukan zona tujuan (misal Zona A) dan rak penyimpanan.
   - Masukkan kuantitas putaway = 18.
   - Klik "Konfirmasi Putaway".
   - **Assertion:** Status surat jalan berubah menjadi `selesai`, pesan "Putaway berhasil" tampil.
5. **Langkah 5 (Verifikasi Ledger Stok oleh Admin):**
   - Login ulang sebagai Admin General.
   - Buka `/dashboard/reports` -> Tab Mutasi Stok.
   - **Assertion:** Terdapat mutasi masuk (+18) untuk barang dan zona terkait dengan referensi nomor surat jalan inbound.

---

### E2E-03: Siklus Penuh Outbound, Approval Supervisor, Delivery & Konfirmasi Distribusi

- **Deskripsi:** Pengeluaran material untuk proyek telekomunikasi: Admin/Staf membuat surat jalan outbound, sistem melakukan reservasi stok zona, Supervisor meninjau dan menyetujui di antrian approval, pengiriman dilakukan hingga tiba di lapangan, dan Supervisor mengonfirmasi barang telah diterima dan didistribusikan sehingga stok fisik terpotong.
- **Precondition:**
  - Stok material tersedia di zona gudang (dari hasil Inbound sebelumnya).
  - Proyek dan cluster telekomunikasi tujuan aktif.
- **Postcondition:**
  - Status Surat Jalan Outbound berubah dari `draft_diajukan` -> `disetujui` -> `sedang_dikirim` -> `tiba_menunggu_konfirmasi` -> `diterima_didistribusikan`.
  - Stok pada `stok_gudang` berkurang secara permanen.
  - Record mutasi keluar bertipe `OUT` tercatat di `stok_ledger`.
- **Traceability:** `OUT-01`, `OUT-03`, `OUT-06`, `OUT-08`, `OUT-09`, `OUT-11`, `BOQ-01`.

#### Langkah & Assertion E2E-03:
1. **Langkah 1 (Pembuatan Outbound):**
   - Login sebagai Admin atau Staf Gudang.
   - Buka menu Surat Jalan Outbound.
   - Buat SJ baru: pilih Proyek, Cluster, Gudang Asal, Kendaraan/Driver, dan Barang (kuantitas = 5).
   - Klik "Simpan & Ajukan".
   - **Assertion:** Surat jalan terbentuk dengan status `draft_diajukan`. Stok sebesar 5 unit di-reserve.
2. **Langkah 2 (Supervisor Review & Approval):**
   - Login sebagai Supervisor (`budi.santoso@digitakgudang.com`).
   - Buka `/dashboard/supervisor/approval`.
   - Temukan surat jalan outbound yang baru diajukan di antrian.
   - Klik tombol "Setujui" (Approve).
   - Konfirmasi pada modal persetujuan.
   - **Assertion:** Status surat jalan berubah menjadi `disetujui`. Notifikasi persetujuan tercatat.
3. **Langkah 3 (Pengiriman oleh Staf Gudang):**
   - Login sebagai Staf Gudang.
   - Buka menu Outbound Staf.
   - Pada surat jalan yang telah disetujui, klik "Mulai Pengiriman".
   - **Assertion:** Status berubah menjadi `sedang_dikirim`.
4. **Langkah 4 (Pelaporan Tiba di Lapangan):**
   - Setelah material sampai di titik lapangan, klik "Lapor Tiba".
   - **Assertion:** Status berubah menjadi `tiba_menunggu_konfirmasi`.
5. **Langkah 5 (Konfirmasi Distribusi oleh Supervisor):**
   - Login kembali sebagai Supervisor.
   - Buka detail surat jalan terkait.
   - Klik "Konfirmasi Diterima & Didistribusikan".
   - **Assertion:** Status final menjadi `diterima_didistribusikan`.
6. **Langkah 6 (Verifikasi Pengurangan Stok):**
   - Buka menu laporan stok atau utilisasi gudang.
   - **Assertion:** Sisa stok barang di gudang asal berkurang tepat 5 unit, dan ledger `OUT` tercatat lengkap dengan timestamp.

---

### E2E-04: Skenario Penolakan Outbound (Rejection Path & Rollback Stok)

- **Deskripsi:** Pengajuan outbound yang ditolak oleh supervisor dengan alasan tertentu, memastikan alokasi stok yang sempat di-reserve dikembalikan secara utuh ke saldo stok tersedia.
- **Precondition:**
  - Terdapat draft outbound yang diajukan.
- **Postcondition:**
  - Status SJ berubah menjadi `ditolak`.
  - Catatan alasan penolakan tersimpan di database dan tampil di riwayat surat jalan.
  - Reservasi stok dibatalkan (saldo stok kembali utuh).
- **Traceability:** `OUT-04`, `OUT-05`, `OUT-10`.

#### Langkah & Assertion E2E-04:
1. **Langkah 1 (Ajukan Outbound):**
   - Buat outbound untuk 5 unit material. Status = `draft_diajukan`.
2. **Langkah 2 (Supervisor Tolak):**
   - Supervisor membuka antrian approval.
   - Klik "Tolak".
   - Masukkan alasan: "Material dialihkan untuk prioritas gangguan darurat".
   - Konfirmasi tolak.
   - **Assertion:** Status berubah menjadi `ditolak`, pesan penolakan dan nama approver tercatat.
3. **Langkah 3 (Verifikasi Rollback Stok):**
   - Periksa ketersediaan stok barang terkait di gudang.
   - **Assertion:** Saldo stok yang dapat digunakan (*available stock*) kembali ke jumlah semula sebelum pengajuan.

---

### E2E-05: Alur Rekonsiliasi Hardware & Validasi Kesalahan Template Excel

- **Deskripsi:** Pengujian alur rekonsiliasi material lapangan: mengunduh template resmi, menguji ketahanan terhadap upload file tidak valid / kolom rusak, mengunggah file valid, melihat pratinjau hasil analisa selisih, dan mengonfirmasi hasil ke database.
- **Precondition:**
  - Login sebagai Admin atau Supervisor.
- **Postcondition:**
  - Data laporan mitra tersimpan di sistem, selisih material antara data gudang dan data lapangan terekonsiliasi.
- **Traceability:** `RECON-01`, `RECON-02`, `RECON-03`, `RECON-04`, `RECON-06`.

#### Langkah & Assertion E2E-05:
1. **Langkah 1 (Download Template):**
   - Buka `/dashboard/reconciliation`.
   - Klik "Download Template".
   - **Assertion:** File `.xlsx` terunduh dengan header kolom yang valid.
2. **Langkah 2 (Negative Test Upload):**
   - Unggah file non-Excel (misal `.txt`).
   - **Assertion:** Sistem menampilkan pesan penolakan format file.
3. **Langkah 3 (Positive Upload & Preview):**
   - Unggah file Excel valid yang berisi rekap penggunaan hardware mitra.
   - **Assertion:** Sistem menampilkan tabel preview data yang berhasil diparsing tanpa error.
4. **Langkah 4 (Konfirmasi Rekonsiliasi):**
   - Klik "Konfirmasi Simpan".
   - **Assertion:** Notifikasi keberhasilan muncul, data masuk ke ringkasan inventaris rekonsiliasi.

---

## 3. Matriks Ketertelusuran Pengujian (Traceability Matrix)

| Skenario E2E | Fitur Utama | Blackbox Test Cases Terkait | Peran Terlibat | Prioritas Bisnis |
|---|---|---|---|---|
| **E2E-01** | Autentikasi, Sesi, & RBAC | `AUTH-01` s/d `AUTH-12`, `RBAC-01` s/d `RBAC-06` | Admin, Supervisor, Staff | **Critical** |
| **E2E-02** | Inbound, Inspection, & Putaway | `INB-01` s/d `INB-10`, `MSTR-01`, `MSTR-08` | Staff, Admin | **Critical** |
| **E2E-03** | Outbound, Picking, Approval, Delivery | `OUT-01` s/d `OUT-03`, `OUT-06` s/d `OUT-09`, `OUT-11` | Admin, Supervisor, Staff | **Critical** |
| **E2E-04** | Penolakan Outbound & Rollback | `OUT-04`, `OUT-05`, `OUT-10` | Supervisor, Staff | **High** |
| **E2E-05** | Rekonsiliasi Hardware Excel | `RECON-01` s/d `RECON-06` | Admin, Supervisor | **High** |
| **E2E-06** | Master Data & Audit Log | `MSTR-01` s/d `MSTR-10`, `RPT-01` s/d `RPT-04`, `USR-01` | Admin | **High** |
