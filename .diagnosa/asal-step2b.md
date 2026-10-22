# Progress Step 2B: Tampilkan asal_label dan badge di Riwayat Stok

## File + baris diubah

### `frontend/app/dashboard/reports/page.tsx`

1. **Baris 147-148**: Tambah `asal_label?: string | null;` dan `asal_tipe?: string | null;` pada interface `StockHistoryEntry`.
2. **Baris 808-833**: Tambah konstanta `ASAL_TIPE_LABEL` dan fungsi `renderAsal(row)` di dalam `TabRiwayatStok`.
3. **Baris 1363-1367**: Ganti sel Asal → Tujuan menjadi memanggil `{renderAsal(r)}` untuk sisi ASAL, dengan fallback ke `r.gudang_asal` lama jika `asal_label` kosong. Sisi TUJUAN tidak diubah.

## Hasil type check
- `npx tsc --noEmit` menghasilkan error di `app/staff/outbound/[suratJalanId]/picking/page.tsx(338,32)` dan `(339,47)`, tetapi itu adalah error pre-existing di file lain, bukan akibat perubahan pada `reports/page.tsx`.

## Temuan tujuan kosong (hanya laporan, tidak diperbaiki)
- Kolom TUJUAN (`gudang_tujuan`) dapat menampilkan "-" untuk transaksi tertentu, misalnya inbound dari pemasok eksternal atau outbound/return yang tidak mengisi `gudang_tujuan_id` pada `surat_jalan`. Ini menyentuh sisi TUJUAN yang tidak diubah pada langkah ini.

## Cara tes
1. Buka `/dashboard/reports` dan pastikan tab Riwayat Stok aktif.
2. Cek kolom "Asal → Tujuan": untuk baris yang memiliki `asal_label`, harus tampil teks nama asal diikuti badge kecil berlabel tipe (Gudang/Pemasok/Project/Return).
3. Untuk baris tanpa `asal_label`, harus tetap menampilkan nilai `gudang_asal` lama sebagai fallback.
4. Pastikan sisi tujuan tidak berubah dan tetap menggunakan `gudang_tujuan`.
