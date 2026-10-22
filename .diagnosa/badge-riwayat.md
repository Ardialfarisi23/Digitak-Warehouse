# Progress Badge Riwayat: Perbaikan tampilan badge di Tab Riwayat Input Laporan Mitra

## File + baris diubah

### `frontend/app/dashboard/reports/page.tsx`

1. **Baris 60-67**: Tambah `className?: string` ke props komponen `Badge` lokal dan gabungkan ke className span.
2. **Baris 1574-1582**: Perluas `statusBadge()` agar menangani `sebagian_gagal` (orange) dan `draft` (gray), selain `berhasil` (green) dan `gagal` (red). Tambahkan fallback Title Case untuk status tak dikenal.
3. **Baris 1678-1689**: 
   - **Nama File**: Jika `manual-input`, tampilkan badge `Input Manual` (variant `blue`). Jika Excel (.xlsx/.xls/.csv), tampilkan nama file dengan truncate + tooltip + badge `Excel` (variant `outline-gray`).
   - **Diunggah Oleh**: Ganti role mentah menjadi badge dengan `humanizeValue("user_role", r.uploaded_by_role)` (variant `gray`). Fallback Title Case otomatis ditangani oleh `humanizeValue`.

## Hasil type check
- `npx tsc --noEmit` — **LULUS** tanpa error.

## Cara tes manual
1. Buka `/dashboard/reports?tab=reconciliation`.
2. Cek tabel daftar upload:
   - Kolom "Diunggah Oleh": role harus tampil sebagai badge kecil (mis. "Admin General", "Supervisor", "Staf Gudang").
   - Kolom "Nama File": 
     - Jika `manual-input`, tampil badge biru "Input Manual".
     - Jika Excel, tampil nama file + badge outline "Excel".
     - Nama file panjang dipotong dengan tooltip nama lengkap.
   - Kolom "Status": semua status (Berhasil, Draft, Gagal, Sebagian Gagal) harus berupa badge pill berwarna.
3. Cek modal Detail Upload Laporan Mitra tetap tidak terpengaruh.
