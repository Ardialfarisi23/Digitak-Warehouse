# PROGRESS PICKING DROPDOWN

## Langkah 1 - Diagnosa
- Toggle "Tampilkan kondisi lain" ada di kode tetapi dropdown tetap kosong karena `zonesToShow` tidak di-build dari entri kondisi lain yang tersedia di `pickingStockByItem[item.barang_id]`.
- Filter sebelumnya hanya mengecek `available_qty > 0` pada `pickingStockByItem`, tetapi tidak memetakan zona mana saja yang punya stok kondisi lain untuk ditampilkan sebagai opsi.

## Langkah 2 - Perbaikan
- File: `frontend/app/staff/outbound/[suratJalanId]/picking/page.tsx`
- Ubah `zonesToShow` ketika `showOtherConditions` aktif: gunakan `otherKondisi` untuk mendapatkan `zona_id` yang tersedia, lalu filter `zonasForGudang` berdasarkan `zona_id` tersebut.
- Render `<option>` dengan label yang jelas: `Zona X — rusak_ringan (5) unit`
- Dialog konfirmasi override tetap muncul saat memilih opsi kondisi lain (tidak diubah)

## Langkah 3 - Verifikasi
- Type-check: lolos
- Git diff: 2 files changed (warehouse.repository.js + picking/page.tsx)
- Tidak ada perubahan backend/schema/migrations/seed
- Tidak ada query tulis baru
