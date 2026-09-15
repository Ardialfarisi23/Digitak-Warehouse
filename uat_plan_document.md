# DOKUMEN RENCANA UAT (USER ACCEPTANCE TESTING)
**SISTEM MANAGEMENT DIGITAK WAREHOUSE**

---

## 1. INFORMASI DOKUMEN & METADATA

| Parameter | Keterangan |
| :--- | :--- |
| **Nama Proyek** | Digitak Warehouse Management System |
| **Versi Dokumen** | v1.0.0 |
| **Tanggal Penyusunan** | 15 September 2026 |
| **Penyusun** | QA Engineer & Testing Team |
| **Target Penguji** | Warehouse Supervisor, Admin Gudang, Stakeholder Operasional, Mitra Kerja |
| **Lingkungan Uji** | Staging / UAT Environment (Web Browser Chrome/Firefox/Edge Latest) |

---

## 2. TUJUAN & CAKUPAN PENGUJIANKU (OBJECTIVE & SCOPE)

Dokumen ini disusun untuk memandu jalannya **User Acceptance Testing (UAT)** guna memvalidasi bahwa sistem web **Digitak Warehouse** telah memenuhi spesifikasi bisnis dan kriteria penerimaan pengguna (*User Acceptance Criteria*).

### Cakupan Pengujian:
1. **Modul Audit Trail (`audit_log` & `user_account`)**: Memastikan pencatatan audit trail akurat untuk setiap aksi (*create, update, delete, approve, receive, putaway*), perekaman state `data_sebelum` dan `data_sesudah`, pemetaan `actor_id` ke nama & role pengguna, serta fitur pencarian berdasarkan kode tiket material.
2. **Modul Riwayat Stok / Stok Ledger (`stok_ledger`, `surat_jalan`, `surat_jalan_item`)**: Memvalidasi integritas jurnal mutasi stok (*inbound/outbound*), kebenaran perhitungan `qty` dan `saldo_setelah`, serta keterhubungan informasi sumber transaksi surat jalan.
3. **Modul Riwayat Input Laporan Mitra (`reconciliation_upload_log` & `reconciliation_upload_detail`)**: Memastikan proses unggah laporan mitra lancar, agregasi ringkasan (*total, success, failed rows*), konsistensi detail baris data, dan kejelasan pesan kegagalan (*reason*).

---

## 3. KRITERIA PENERIMAAN & PRASYARAT (ENTRY & EXIT CRITERIA)

### Prasyarat Pengujian (Entry Criteria):
- Lingkungan UAT/Staging telah terpasang dengan versi aplikasi terbaru dan data awal (*seed data*) yang representatif.
- Akun pengguna untuk seluruh role (Admin General, Supervisor, Staf Gudang) telah siap dan memiliki hak akses yang sesuai.
- Seluruh modul yang diuji telah lolos *Integration Testing* dan *System Testing* oleh tim developer & QA internal.

### Kriteria Kelulusan (Exit Criteria):
- **100%** Test Case Critical dan High Priority dinyatakan **PASS**.
- Tidak ada bug dengan severity *Blocker* atau *Critical* yang menggantung.
- Stakeholder utama menandatangani *UAT Acceptance Sign-off*.

---

## 4. TABEL SKENARIO PENGUJI UAT (UAT TEST CASES)

### MODUL 1: AUDIT TRAIL (`audit_log` & `user_account`)

| ID Test Case | Nama Modul / Fitur | Skenario Pengujian (Test Scenario) | Langkah-langkah Pengujian (Test Steps) | Data Uji (Test Data) | Hasil yang Diharapkan (Expected Result) | Status (Pass/Fail/Notes) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UAT-AUD-001** | Audit Trail | Pencatatan Log saat Pembuatan Data Baru (*Create Entity*) | 1. Login sebagai `staf_gudang`.<br>2. Tambahkan data Barang / Gudang / BOQ baru.<br>3. Buka menu Audit Trail.<br>4. Cari entry log terbaru untuk entitas tersebut. | `entity_type`: "barang"<br>`aksi`: "create"<br>User: Staff Gudang A | 1. Log baru tercatat dengan timestamp akurat.<br>2. Field `aksi` berisi `create`.<br>3. Field `data_sebelum` bernilai `null` / kosong.<br>4. Field `data_sesudah` berisi objek JSON lengkap data baru yang dibuat. | `[   ]` |
| **UAT-AUD-002** | Audit Trail | Pencatatan Log saat Perubahan Data (*Update Entity*) dengan State *Before/After* | 1. Login sebagai `supervisor`.<br>2. Edit informasi barang / lokasi gudang.<br>3. Simpan perubahan.<br>4. Buka halaman Audit Trail dan pilih detail log transaksi tersebut. | `entity_type`: "gudang"<br>`aksi`: "update"<br>Field diubah: `kapasitas_maksimum` dari 1000 ke 1500 | 1. Log tercatat dengan `aksi = update`.<br>2. Modal detail audit menampilkan perbandingan JSON `data_sebelum` (`kapasitas: 1000`) dan `data_sesudah` (`kapasitas: 1500`) secara jelas. | `[   ]` |
| **UAT-AUD-003** | Audit Trail | Pencatatan Log saat Penghapusan Data (*Delete Entity*) | 1. Login sebagai `admin_general`.<br>2. Hapus satu entitas data yang diizinkan.<br>3. Cek daftar Audit Log. | `entity_type`: "titik_lapangan"<br>`aksi`: "delete" | 1. Log pencatatan `delete` terbentuk.<br>2. `data_sebelum` berisi snapshot lengkap data sebelum dihapus.<br>3. `data_sesudah` bernilai `null`. | `[   ]` |
| **UAT-AUD-004** | Audit Trail | Pencatatan Log Aksi Transaksi Approval & Status Inbound/Outbound | 1. Lakukan aksi verifikasi/approval Surat Jalan Inbound atau Outbound.<br>2. Navigasi ke menu Audit Log. | `entity_type`: "surat_jalan"<br>`aksi`: "approve_inbound" / "approve_outbound" | 1. Aksi approval tercatat spesifik (`approve_inbound`, `approve_outbound`, `putaway`, atau `confirm_distributed`).<br>2. `entity_id` merujuk tepat pada ID Surat Jalan. | `[   ]` |
| **UAT-AUD-005** | Audit Trail | Validasi Relasi `actor_id` dengan Data Pengguna & Role pada UI | 1. Akses tabel Audit Trail pada Dashboard.<br>2. Periksa kolom **Aktor / Pengguna** dan **Peran (Role)**. | Log dibuat oleh `actor_id` = 12 (Nama: "Budi Santoso", Role: `supervisor`) | 1. Tabel UI menampilkan nama terang "Budi Santoso" dan badge role "Supervisor", bukan sekadar ID numerik.<br>2. Informasi profil pengguna konsisten dengan `user_account`. | `[   ]` |
| **UAT-AUD-006** | Audit Trail | Pencarian & Filter Log Menggunakan Kode Tiket Material (`tiket_material`) | 1. Masuk ke halaman Audit Trail.<br>2. Ketikkan kode tiket material pada kolom pencarian.<br>3. Tekan Cari / Filter. | Keyword: `TKT-2026-08-001` | 1. Sistem menampilkan daftar log audit yang relevan dengan tiket tersebut (misal aksi `create_inbound`, `approve_inbound`, dll).<br>2. Hasil pencarian responsif dan tidak menampilkan log di luar tiket yang dicari. | `[   ]` |
| **UAT-AUD-007** | Audit Trail | Filter Log Berdasarkan Tipe Entitas (`entity_type`) & Rentang Tanggal | 1. Pilih filter `entity_type` = "surat_jalan".<br>2. Tentukan rentang tanggal 01/09/2026 - 15/09/2026.<br>3. Klik Terapkan Filter. | Entity: `surat_jalan`<br>Date Range: 2026-09-01 s/d 2026-09-15 | 1. Hanya log transaksi `surat_jalan` dalam rentang tanggal tersebut yang muncul.<br>2. Fitur reset filter mengembalikan tampilan ke seluruh log audit. | `[   ]` |

---

### MODUL 2: RIWAYAT STOK / STOK LEDGER (`stok_ledger`, `surat_jalan`, `surat_jalan_item`)

| ID Test Case | Nama Modul / Fitur | Skenario Pengujian (Test Scenario) | Langkah-langkah Pengujian (Test Steps) | Data Uji (Test Data) | Hasil yang Diharapkan (Expected Result) | Status (Pass/Fail/Notes) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UAT-STK-001** | Stok Ledger | Pencatatan Jurnal Mutasi Stok Masuk (*Inbound Goods Receipt*) | 1. Selesaikan proses penerimaan & putaway Surat Jalan Inbound.<br>2. Buka menu Riwayat Stok / Stok Ledger.<br>3. Cari transaksi barang yang diterima. | Barang: `Kabel FO 48 Core`<br>Surat Jalan Inbound: `SJ-IN-202609001`<br>Qty Masuk: `500` Meter | 1. Jurnal mutasi stok bertambah 1 baris.<br>2. Kolom `jenis_mutasi` bernilai `in`.<br>3. Kolom `qty` tercatat `+500`.<br>4. `saldo_setelah` bertambah tepat 500 dari saldo sebelumnya. | `[   ]` |
| **UAT-STK-002** | Stok Ledger | Pencatatan Jurnal Mutasi Stok Keluar (*Outbound Delivery*) | 1. Selesaikan approval & distribusi Surat Jalan Outbound.<br>2. Buka menu Riwayat Stok.<br>3. Filter berdasarkan barang yang dikirim. | Barang: `ONT Huawei HG8245H`<br>Surat Jalan Outbound: `SJ-OUT-202609015`<br>Qty Keluar: `20` Pcs | 1. Jurnal mutasi stok mencatat transaksi baru.<br>2. Kolom `jenis_mutasi` bernilai `out`.<br>3. Kolom `qty` tercatat `20`.<br>4. `saldo_setelah` berkurang tepat 20 dari saldo sebelumnya. | `[   ]` |
| **UAT-STK-003** | Stok Ledger | Verifikasi Akurasi Rumus Math `saldo_setelah` Akumulatif | 1. Lakukan beberapa transaksi berturut-turut (Inbound 100 -> Outbound 30 -> Inbound 50).<br>2. Periksa baris demi baris pada tabel Stok Ledger. | Saldo Awal: `0`<br>Trans 1 (+100) -> Trans 2 (-30) -> Trans 3 (+50) | 1. Trans 1: `saldo_setelah` = 100.<br>2. Trans 2: `saldo_setelah` = 70.<br>3. Trans 3: `saldo_setelah` = 120.<br>4. Tidak terjadi *race condition* atau penyimpangan angka desimal (`db.Decimal(14,2)`). | `[   ]` |
| **UAT-STK-004** | Stok Ledger | Validasi Presisi Informasi Sumber Data Surat Jalan pada UI | 1. Di halaman Riwayat Stok, klik/lihat kolom **Sumber Transaksi / Surat Jalan**.<br>2. Periksa detail referensi yang ditampilkan. | ID Surat Jalan Item yang terhubung dengan `surat_jalan` | 1. UI menampilkan Nomor Surat Jalan (`no_surat_jalan`), Jenis Transaksi (`Inbound` / `Outbound`), dan Status Surat Jalan (`disetujui`, `diterima_didistribusikan`, `ready_putaway`).<br>2. Mengklik nomor SJ mengarahkan (*link*) ke detail Surat Jalan yang bersangkutan. | `[   ]` |
| **UAT-STK-005** | Stok Ledger | Penanganan Mutasi Multi-Item dalam Satu Surat Jalan | 1. Buat dan selesaikan Surat Jalan yang memuat 3 jenis barang berbeda.<br>2. Periksa mutasi pada Stok Ledger. | Surat Jalan: `SJ-IN-MULTI-01` berisi Barang A (10 pcs), Barang B (20 pcs), Barang C (5 pcs) | 1. Masing-masing barang tercatat secara terpisah sesuai `surat_jalan_item_id`.<br>2. `saldo_setelah` untuk tiap-tiap barang dihitung independen. | `[   ]` |
| **UAT-STK-006** | Stok Ledger | Filtering & Export Riwayat Stok per Gudang / Zona / Barang / Periode | 1. Buka halaman Riwayat Stok.<br>2. Gunakan kombinasi filter: Gudang A, Barang X, Periode Bulan Ini.<br>3. Klik tombol Export (Excel/PDF) jika tersedia. | Gudang: `Gudang Utama Surabaya`<br>Barang: `Splicer Fujikura` | 1. Tabel hanya menampilkan riwayat mutasi barang dan gudang terpilih.<br>2. Hasil export data sesuai persis dengan tampilan tabel yang difilter. | `[   ]` |

---

### MODUL 3: RIWAYAT INPUT LAPORAN MITRA (`reconciliation_upload_log` & `reconciliation_upload_detail`)

| ID Test Case | Nama Modul / Fitur | Skenario Pengujian (Test Scenario) | Langkah-langkah Pengujian (Test Steps) | Data Uji (Test Data) | Hasil yang Diharapkan (Expected Result) | Status (Pass/Fail/Notes) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UAT-REP-001** | Laporan Mitra | Proses Unggah File Laporan Rekonsiliasi Mitra Format Valid | 1. Login sebagai Mitra / Admin Logistik.<br>2. Masuk ke menu **Unggah Laporan Mitra**.<br>3. Pilih file Excel/CSV rekonsiliasi yang formatnya valid.<br>4. Klik **Unggah / Submit**. | File: `Laporan_Mitra_Sept_2026.xlsx`<br>Jumlah Baris: 50 baris valid | 1. Proses unggah berhasil dengan notifikasi sukses.<br>2. Sistem membuat entry baru di `reconciliation_upload_log`.<br>3. Halaman otomatis berpindah atau memperbarui Tab Riwayat Unggah. | `[   ]` |
| **UAT-REP-002** | Laporan Mitra | Konsistensi Ringkasan Log Utama (`total_rows`, `success_rows`, `failed_rows`) | 1. Unggah file yang berisi kombinasi 8 baris valid dan 2 baris invalid.<br>2. Cek card/tabel summary pada Tab Riwayat Upload Log. | File: `Test_Partial_Upload.xlsx`<br>Total: 10 baris (8 valid, 2 invalid) | 1. `filename` tercatat akurat.<br>2. `total_rows` = 10.<br>3. `success_rows` = 8.<br>4. `failed_rows` = 2.<br>5. Angka statistik di UI 100% cocok dengan jumlah detail sebenarnya. | `[   ]` |
| **UAT-REP-003** | Laporan Mitra | Pencatatan Detail Baris Gagal (`status = gagal`) dan Kejelasan Alasan Error (`reason`) | 1. Pada Tab Riwayat Upload Log, klik **Lihat Detail** pada upload log yang memiliki baris gagal.<br>2. Amati daftar baris pada `reconciliation_upload_detail`. | Baris ke-4: `kode_tiket` tidak ditemukan di DB.<br>Baris ke-9: nilai `used` melebihi `mos`. | 1. Baris gagal memiliki badge `status` = **Gagal** (Warna Merah).<br>2. Kolom `reason` menampilkan deskripsi pesan error yang informatif (misal: *"Kode Tiket TKT-999 tidak terdaftar dalam sistem"*). | `[   ]` |
| **UAT-REP-004** | Laporan Mitra | Validasi Informasi Uploader (`uploaded_by`) dan Timestamp (`uploaded_at`) | 1. Periksa kolom Pengunggah dan Waktu Unggah pada Tab Riwayat Laporan Mitra. | User Upload: `mitra_vendor_a`<br>Waktu: Real-time server timestamp | 1. Kolom Pengunggah menampilkan Nama/Perusahaan Mitra dari relasi `actor_id` (`user_account`).<br>2. Tanggal & jam unggah tampil sesuai format waktu lokal (misal: `15 Sep 2026, 14:30 WIB`). | `[   ]` |
| **UAT-REP-005** | Laporan Mitra | Pencarian & Penelusuran Detail Upload Melalui Kode Tiket (`kode_tiket`) | 1. Di Tab Riwayat Input Laporan Mitra / Detail Rekonsiliasi, gunakan kolom pencarian kode tiket.<br>2. Inputkan nomor tiket spesifik. | Keyword: `TKT-PLN-2026-004` | 1. Sistem memfilter dan menampilkan riwayat rekonsiliasi yang memuat `kode_tiket` tersebut.<br>2. Nilai `mos` (*Material On Site*) dan `used` (*Material Terpakai*) tampil dengan presisi desimal 2 digit di belakang koma. | `[   ]` |
| **UAT-REP-006** | Laporan Mitra | Validasi Handling File Kosong / Ekstensi Tidak Sesuai (*Edge Case*) | 1. Coba unggah file dengan format `.pdf` atau file Excel 0 Byte (kosong).<br>2. Klik tombol Unggah. | File: `dokumen.pdf` / `empty.xlsx` | 1. Sistem menolak unggahan di tingkat validasi awal (form / API).<br>2. Pesan peringatan tampil: *"Format file tidak didukung / File tidak boleh kosong"*.<br>3. Tidak ada record korup yang masuk ke database. | `[   ]` |

---

## 5. PETUNJUK EKSEKUSI PENGUJIAN & CATATAN PENERIMAAN (SIGN-OFF SHEET)

### Panduan bagi Penguji (*Tester Guide*):
1. **Status Pengujian**: Isi kolom **Status** dengan:
   - `PASS` : Jika hasil pengujian di sistem **sesuai 100%** dengan Hasil yang Diharapkan.
   - `FAIL` : Jika ditemukan perbedaan, bug, kalkulasi salah, atau error pada sistem.
   - `NOTES` : Tambahkan catatan khusus jika ada perilaku tak terduga (*unexpected behaviour*) namun tidak memblokir.
2. **Pelaporan Bug**: Jika status `FAIL`, lampirkan **Screenshot**, **ID Test Case**, **URL Halaman**, dan **Langkah Reproduksi Error** ke sistem pelaporan bug (Jira/GitHub Issues).

---

### LEMBAR PERSETUJUAN PENERIMAAN (UAT SIGN-OFF FORM)

Dengan ini menyatakan bahwa seluruh skenario pengujian UAT pada dokumen ini telah dilaksanakan dengan hasil sebagai berikut:

| Peran | Nama Terang | Jabatan / Instansi | Tanda Tangan | Tanggal |
| :--- | :--- | :--- | :--- | :--- |
| **Lead QA / Tester** | ____________________ | Lead Quality Assurance | ______________ | ___/___/2026 |
| **Warehouse Representative** | ____________________ | Supervisor Gudang | ______________ | ___/___/2026 |
| **Project Manager / Business Owner** | ____________________ | PM / System Owner | ______________ | ___/___/2026 |

**Catatan / Rekomendasi Akhir Stakeholder:**
> ____________________________________________________________________________________________________
> ____________________________________________________________________________________________________
