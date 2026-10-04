# Progress Fix 2: Perbaikan kecil tabel Detail Baris

## File + baris diubah

### `frontend/app/dashboard/reports/page.tsx`

1. **Baris 3**: Tambah `Fragment` ke import React.
2. **Baris 180**: Tambah `className?: string` ke props Modal component.
3. **Baris 199**: Ubah className inner div Modal jadi template literal agar bisa meneruskan `className` opsional.
4. **Baris 1744**: Tambah `className="max-w-3xl"` pada pemakaian Modal untuk "Detail Upload Laporan Mitra".
5. **Baris 1775-1781**: Hapus header kolom "MOS (arsip)" dan "Remains di Lapangan".
6. **Baris 1785-1830**: Ganti Fragment pendek `<>...</>` dengan `<Fragment key={d.detail_id}>...</Fragment>` untuk memperbaiki warning React key. Hapus `key` redundan pada `<tr>` utama (sekarang dipegang Fragment). Hapus cell data MOS dan Remains. Ubah `colSpan={7}` menjadi `colSpan={5}` pada sub-baris detail.

## Kolom tabel setelah perbaikan
1. Kode Tiket
2. Used
3. Kondisi (badge)
4. Status (badge)
5. Alasan Gagal

Sub-baris detail: colSpan=5, menampilkan Nama Barang (Kode Barang), Project, PIC Mitra, Tanggal Laporan, Catatan.

## Hasil type check
- `npx tsc --noEmit` — **LULUS** tanpa error.

## Cara tes
1. Buka `/dashboard/reports?tab=reconciliation`.
2. Klik ikon mata pada baris upload → modal "Detail Upload Laporan Mitra".
3. Pastikan tidak ada warning React key di console.
4. Pastikan tabel menampilkan 5 kolom (Kode Tiket, Used, Kondisi, Status, Alasan Gagal).
5. Pastikan sub-baris detail memiliki colSpan yang benar (5).
6. Pastikan modal tidak terlalu lebar (max-w-3xl).
7. Cek modal lain yang menggunakan Modal component tetap tampil normal (tidak terpengaruh).
