# Progress Step 2B: Tampilkan kondisi dan detail di modal Detail Upload Laporan Mitra

## File + baris diubah

### `frontend/app/dashboard/reports/page.tsx`

1. **Baris 26**: Tambah import `KondisiBadge` dari `@/components/common/KondisiBadge`.
2. **Baris 158-169**: Update interface `ReconciliationUploadLogEntry.details` dengan 7 field baru (opsional, nullable):
   - `kondisi?: string | null`
   - `nama_barang?: string | null`
   - `kode_barang?: string | null`
   - `project_nama?: string | null`
   - `tanggal_laporan?: string | null`
   - `pic_mitra?: string | null`
   - `catatan?: string | null`
3. **Baris 191**: Ubah `max-w-lg` menjadi `max-w-5xl` pada modal container agar tabel lebar cukup.
4. **Baris 1779**: Tambah kolom header `Kondisi` setelah `Used`.
5. **Baris 1809-1815**: Tambah cell badge `KondisiBadge` di setiap baris detail.
6. **Baris 1804-1828**: Tambah sub-baris detail di bawah baris utama jika ada field yang terisi:
   - Nama Barang (Kode Barang)
   - Project
   - PIC Mitra
   - Tanggal Laporan (format `id-ID`, tanpa jam)
   - Catatan
   Jika semua kosong, sub-baris tidak dirender.

## Hasil type check
- `npx tsc --noEmit` — **LULUS** tanpa error.
- `npx eslint` — tidak ada error baru dari perubahan ini (warning yang ada adalah pre-existing: unused imports dan `setState` dalam effect di bagian lain).

## Cara tes manual
1. Buka `/dashboard/reports` dengan `?tab=reconciliation`.
2. Upload file Excel rekonsiliasi dengan kolom Kondisi, Nama Barang, Catatan, dll.
3. Atau input manual dengan mengisi field-field baru.
4. Klik ikon mata pada baris upload → modal "Detail Upload Laporan Mitra".
5. Cek tabel "Detail Baris":
   - Kolom `Kondisi` menampilkan badge berwarna sesuai nilai enum (`baik` = hijau, `rusak_ringan` = oranye, dll).
   - Sub-baris kecil muncul di bawah baris utama menampilkan Nama Barang (Kode Barang), Project, PIC Mitra, Tanggal Laporan, dan Catatan.
   - Data lama yang `null` menampilkan "-" untuk Kondisi, dan tidak menampilkan sub-baris.
6. Cek horizontal scroll pada tabel jika layar kecil.
