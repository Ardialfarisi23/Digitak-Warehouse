# PROGRESS PICKING TOGGLE FIX

## Langkah 1 - Baca ulang kode zonesToShow
- `zonesToShow` saat ini dibangun dengan:
  ```javascript
  const zonesToShow = showOther
    ? zonasForGudang.filter((z) => otherZonaIds.has(z.zona_id))
    : validZones;
  ```
- `zonasForGudang` berasal dari `zonas.filter((z) => Number(z.gudang_id) === Number(data.gudang_asal_id))`
- Masalah: ketika `showOther` aktif, opsi kondisi lain difilter ulang oleh `zonasForGudang`, yang bisa menghilangkan opsi jika zona tidak ada di daftar `zonas` atau tidak lolos filter gudang.

## Langkah 2 - Perbaikan
- Hapus filter `zonasForGudang` untuk mode `showOther`
- Bangun `zonesToShow` langsung dari `otherKondisi` (data yang sudah terfilter dari `pickingStockByItem`)
- Tambah `zonaNameMap` (useMemo) untuk lookup nama zona dari array `zonas` yang sudah di-fetch
- Render `<option>` langsung dari data `otherKondisi` tanpa filter tambahan

## Langkah 3 - Bukti dengan console.log
- Menambahkan console.log sementara untuk melihat `zonesToShow` sebelum render
- Setelah verifikasi visual di browser, console.log dihapus

## Langkah 4 - Verifikasi
- Type-check: lolos
- Git diff: 7 files changed (backend + frontend)
- Tidak ada console.log tersisa
- Tidak ada perubahan backend/schema/migrations/seed
