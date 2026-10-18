# 06 - Kebijakan Privasi

> DRAF - Perlu ditinjau oleh pihak hukum/manajemen sebelum dipublikasikan. Dokumen ini disusun berdasarkan temuan pada skema database (Prisma schema) dan implementasi yang relevan di kode. Isi dapat disesuaikan dengan praktik operasional organisasi.

## 1. Data Apa yang Dikumpulkan dan Tujuannya

Berdasarkan temuan schema, sistem dapat menyimpan data pribadi berikut:

| Data Pribadi | Sumber | Tujuan Pengumpulan |
|---|---|---|
| Nama | user_account.nama, personil.nama, pengirim_eksternal_nama, driver_nama_teks, kendaraan_nama_teks, pic_pemohon_nama | Identifikasi pengguna, penanggung jawab, pengemudi/pemohon untuk operasional gudang & audit |
| Email | user_account.email (unik), personil.email (unik, opsional), email_reference | Autentikasi, komunikasi terkait akun, referensi audit |
| No HP | personil.no_hp (opsional) | Kontak operasional personil |
| Alamat | gudang.alamat, titik_lapangan.alamat, cluster.alamat_lengkap, alamat_lapangan, customer.alamat, supplier.alamat | Lokasi fisik gudang/titik lapangan/klien untuk operasional gudang |
| Foto | user_account/personil/kendaraan/barang.foto, foto_url | Identifikasi visual (foto profil/kendaraan/barang) sesuai kebutuhan operasional |
| IP Address | refresh_token.ip (dicatat saat login/refresh token) | Keamanan (deteksi sesi tidak biasa) & audit |
| User Agent | refresh_token.user_agent | Keamanan sesi & audit |
| Log Aktivitas/Audit | audit_log (entity_type, entity_id, aksi, actor_id, data_sebelum, data_sesudah, created_at) | Jejak audit, investigasi insiden, kepatuhan |
| Data Notifikasi | notification (user_id, role, type, title, message, link, is_read, read_at, created_at) | Penyampaian notifikasi operasional |
| Data Preferensi Notifikasi | user_notification_preferences (user_id, category, enabled) | Pengaturan notifikasi per pengguna |
| Data Reset Password | password_reset_token (email, token, expires, createdAt) | Proses pemulihan akses akun |
| Sesi/Token | refresh_token (token_hash, expires_at, revoked_at, replaced_by, ip, user_agent) | Manajemen sesi & keamanan autentikasi |

## 2. Dasar Pemrosesan, Masa Retensi, dan Siapa yang Bisa Mengakses Data

- **Dasar Pemrosesan**: Pemrosesan data dilakukan untuk mendukung operasional gudang (inbound/outbound/putaway/delivery/BOQ/rekonsiliasi/approval), autentikasi & otorisasi, keamanan sistem, audit, dan kepatuhan internal.
- **Masa Retensi** (berdasarkan pola field created_at/updated_at/expires):
  - Data akun aktif: disimpan selama akun aktif dan sesuai kebutuhan operasional.
  - Log audit (udit_log): umumnya dipertahankan untuk keperluan audit dan investigasi; [ISI: kebijakan retensi spesifik - tentukan periode, mis. 1-7 tahun sesuai kebutuhan kepatuhan].
  - Refresh token: disimpan hingga kadaluarsa (expires_at) atau dicabut (evoked_at) atau digantikan (eplaced_by).
  - Password reset token: disimpan hingga kadaluarsa (expires) atau digunakan (dihapus setelah penggunaan).
  - Notifikasi: [ISI: periode retensi notifikasi sesuai kebijakan organisasi].
  - Data operasional (transaksi gudang): [ISI: sesuai kebutuhan hukum/akuntansi organisasi].
- **Akses Data**:
  - Admin (role dmin_general) - akses luas sesuai kebutuhan administratif & konfigurasi.
  - Supervisor (role supervisor) - akses sesuai wewenang operasional/persetujuan.
  - Staf Gudang (role staf_gudang) - akses terbatas sesuai tugas lapangan.
  - Sistem/Service internal (backend service) - akses melalui kontrol akses berbasis role dan gudang scope.
  - [ISI: pihak ketiga - jika ada, sebutkan dan dasar aksesnya].

## 3. Keamanan Data

Berdasarkan temuan implementasi:
- **Enkripsi Password**: Password disimpan sebagai password_hash (bcrypt) di user_account. Tidak disimpan dalam bentuk plaintext.
- **Sesi & Token**: Menggunakan JWT untuk access token (signed dengan JWT_SECRET) dan refresh token disimpan ter-hash (efresh_token.token_hash, SHA256). Refresh token menerapkan rotasi (token lama di-revoke saat refresh).
- **Kontrol Akses**: 
  - Autentikasi wajib untuk endpoint terlindungi (uth.middleware.js)
  - Otorisasi berbasis role (ole.middleware.js) - mapping role backend ke frontend
  - Pembatasan scope gudang (gudang-scope.middleware.js) untuk membatasi akses data per gudang
  - equire-password-change.middleware.js untuk memaksa ubah password jika diperlukan
- **Keamanan Lainnya**:
  - Rate limiting pada endpoint sensitif (login, forgot/reset password, refresh, upload, delete) - dikonfigurasi via env
  - Validasi input (Zod validation) di berbagai modul
  - Penanganan CORS dengan whitelist allowed origins (hardcoded di pp.js)
  - Security headers dasar (X-Content-Type-Options, Referrer-Policy)
  - JSON bigint serializer untuk mencegah masalah serialisasi
  - Audit logging untuk aksi penting (login success/failed, transaksi kunci, dll.)
- **Catatan Keamanan**: [ISI: kebijakan tambahan (backup, monitoring, incident response) sesuai organisasi].

## 4. Hak Pengguna (sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi)

Berdasarkan ketentuan UU PDP, pengguna memiliki hak sebagai berikut:
- **Hak untuk mendapatkan informasi** tentang pemrosesan data pribadi.
- **Hak akses** atas data pribadi yang disimpan.
- **Hak perbaikan/koreksi** atas data pribadi yang tidak akurat atau tidak lengkap.
- **Hak penghapusan** atas data pribadi tertentu (dengan mempertimbangkan kewajiban retensi hukum).
- **Hak pembatasan pemrosesan** dalam kondisi tertentu.
- **Hak keberatan** atas pemrosesan data pribadi.
- **Hak atas portabilitas data** (jika relevan).
- **Hak untuk menarik persetujuan** yang diberikan.
- **Hak mengajukan pengaduan** ke otoritas pelindungan data pribadi.

**Cara Menghubungi Admin**: [ISI: nama kontak admin/koordinator PDP, email, nomor telepon, unit kerja]

## 5. Penutup

Kebijakan ini dapat diperbarui sewaktu-waktu sesuai kebutuhan dan perkembangan peraturan. Perubahan akan diinformasikan melalui saluran resmi organisasi.

[Nama Organisasi] - [ISI: nama lengkap organisasi]  
[Alamat Organisasi] - [ISI: alamat]
