# 04 - Panduan Pengguna

## Pengantar

Sistem Gudang Internal Digitak Warehouse adalah aplikasi berbasis web untuk membantu mengelola aktivitas gudang sehari-hari. Sistem ini dirancang agar mudah digunakan oleh tiga jenis pengguna: Admin, Supervisor, dan Staf Gudang.

## Daftar Peran dan Hak Akses

| Peran | Deskripsi | Hal yang bisa dilakukan |
|---|---|---|
| Admin | Pengelola sistem | Mengelola master data, pengguna, gudang, BOQ, surat jalan, rekonsiliasi, laporan, dan pengaturan. |
| Supervisor | Pengawas operasional | Melakukan approval, memantau stok dan distribusi, serta mengelola operasional sesuai wewenang. |
| Staf Gudang | Pelaksana lapangan | Menerima barang (inbound), pengambilan (outbound), penempatan (putaway), melihat tugas harian dan riwayat. |

## Cara Login

1. Buka halaman login. [Screenshot: Halaman Login]
2. Masukkan email dan kata sandi.
3. Tekan tombol 'Masuk'.
4. Anda akan diarahkan ke halaman beranda sesuai peran.

## Ganti Kata Sandi & Reset Kata Sandi

### Ganti Kata Sandi (sudah login)
1. Buka halaman Profil atau menu Ganti Kata Sandi. [Screenshot: Halaman Ganti Kata Sandi]
2. Masukkan kata sandi saat ini, lalu kata sandi baru.
3. Konfirmasi kata sandi baru.
4. Tekan tombol 'Simpan'.

### Reset Kata Sandi (lupa kata sandi)
1. Buka halaman Login, klik 'Lupa kata sandi?'. [Screenshot: Halaman Lupa Kata Sandi]
2. Masukkan email terdaftar.
3. Ikuti petunjuk yang ditampilkan.
4. Periksa langkah selanjutnya. [Screenshot: Halaman Reset Kata Sandi]

> Catatan: Jika tidak menerima instruksi, hubungi Admin.

## Panduan Per Fitur Utama per Peran

### A. Admin
- **Dashboard**: Lihat ringkasan stok, surat jalan, aktivitas terbaru. [Screenshot: Dashboard Admin]
- **Master Data**: Kelola Barang, Kategori, Satuan, Gudang, Zona, Rak, Aisle, Titik Lapangan, Proyek, Cluster, Supplier, Pelanggan, Kendaraan, Personil, Pengguna. [Screenshot: Halaman Master Data]
- **Cluster dan BOQ**: Kelola data cluster dan BOQ. [Screenshot: Halaman Cluster dan BOQ]
- **Surat Jalan**: Lihat, buat, dan pantau surat jalan. [Screenshot: Halaman Surat Jalan - Admin]
- **Gudang dan Layout**: Lihat tata letak, zona, kapasitas gudang. [Screenshot: Halaman Gudang dan Layout]
- **Rekonsiliasi**: Cocokkan stok fisik dengan data sistem. [Screenshot: Halaman Rekonsiliasi - Admin]
- **Laporan dan Audit**: Lihat dan unduh laporan. [Screenshot: Halaman Laporan dan Audit]
- **Manajemen Pengguna**: Tambah/ubah peran/aktif/nonaktifkan pengguna. [Screenshot: Halaman Manajemen Pengguna]

### B. Supervisor
- **Dashboard Supervisor**: Pantau approval, surat jalan, stok. [Screenshot: Dashboard Supervisor]
- **Approval**: Lihat, setujui, atau tolak permohonan. [Screenshot: Halaman Approval]
- **Cluster dan BOQ**: Pantau data cluster/BOQ. [Screenshot: Cluster dan BOQ - Supervisor]
- **Utilisasi Gudang**: Pantau pemakaian ruang/zona/kapasitas. [Screenshot: Utilisasi Gudang]
- **Data Operasional dan Tim**: Kelola data operasional dan tim. [Screenshot: Data Operasional dan Tim]
- **Master Data (terbatas)**: Akses terbatas sesuai wewenang. [Screenshot: Master Data - Supervisor]
- **Rekonsiliasi dan Area**: Mendukung rekonsiliasi dan pengelolaan area. [Screenshot: Rekonsiliasi dan Area]

### C. Staf Gudang
- **Tugas Saya**: Lihat daftar tugas harian. [Screenshot: Dashboard Staf]
- **Surat Jalan (Outbound)**: Mulai picking dan distribusi. [Screenshot: Proses Picking]
- **Penerimaan (Inbound)**: Cek fisik, isi jumlah/kondisi, konfirmasi. [Screenshot: Form Penerimaan]
- **Lokasi dan Rak (Putaway)**: Menempatkan barang ke lokasi/zona/rak. [Screenshot: Form Putaway]

## FAQ (10 Pertanyaan)

1. **Bagaimana jika lupa kata sandi?** Klik 'Lupa kata sandi?' di halaman login, masukkan email, ikuti petunjuk.
2. **Kenapa menu tertentu tidak bisa diakses?** Menu disesuaikan peran. Hubungi Admin jika perlu.
3. **Di mana melihat tugas hari ini?** Staf Gudang bisa melihat di 'Tugas Saya'.
4. **Kapan harus approval?** Supervisor melihat di 'Approval' saat ada permohonan menunggu.
5. **Bagaimana mencatat penerimaan?** Masuk 'Penerimaan', pilih surat jalan, isi jumlah/kondisi, konfirmasi.
6. **Apa itu putaway?** Menempatkan barang yang diterima ke lokasi/zona/rak yang ditentukan.
7. **Di mana melihat laporan stok?** Admin/Supervisor bisa melihat di 'Laporan dan Audit' atau 'Rekonsiliasi'.
8. **Kenapa tombol simpan tidak aktif?** Pastikan semua kolom wajib terisi dengan benar.
9. **Data tidak muncul setelah filter?** Coba hapus atau ubah kriteria filter.
10. **Siapa yang bisa kelola pengguna?** Hanya Admin melalui 'Manajemen Pengguna'.

## Pesan Error Umum dan Artinya

| Pesan Error | Arti bagi Pengguna | Solusi Sederhana |
|---|---|---|
| 'Email atau kata sandi salah' | Email/kata sandi tidak cocok | Periksa kembali email & kata sandi |
| 'Akun Anda telah dinonaktifkan' | Akun tidak aktif | Hubungi Admin |
| 'Anda tidak memiliki hak akses' | Tidak boleh akses menu ini | Gunakan menu sesuai peran atau hubungi Admin |
| 'Data wajib diisi' / 'Format tidak valid' | Isian belum lengkap/salah format | Lengkapi kolom wajib, perbaiki format |
| 'Token tidak ditemukan' / 'Sesi Anda telah berakhir' | Sesi login habis | Login kembali |
| 'Anda wajib mengganti kata sandi' | Perlu ganti kata sandi | Ganti kata sandi, lalu lanjutkan |
| 'Tidak dapat terhubung ke server' | Koneksi terputus | Periksa internet, muat ulang halaman |
| 'Data tidak ditemukan' | Data tidak ada/sudah dihapus | Periksa filter atau hubungi Admin |
| 'Gagal menyimpan data' | Kendala saat menyimpan | Coba lagi atau periksa isian |
| 'Terlalu banyak percobaan. Coba lagi nanti' | Batas percobaan terlampaui | Tunggu beberapa saat, coba lagi |

