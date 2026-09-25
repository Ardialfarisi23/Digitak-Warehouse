# PROGRESS KONDISI 2C

## Langkah 1 - Riset
- Frontend picking page sudah memiliki:
  - `pickingStockByItem` dari endpoint `picking-stock-check` yang mengembalikan zona per kondisi
  - `getValidZonesForItem` yang memfilter zona berdasarkan kondisi yang diminta item
  - `confirmSubmit` yang mengirim payload `{ item_id, qty, zona_id }`
- Backend retrieve (`surat-jalan.service.js:1000`) menggunakan `kondisi: suratItem.kondisi || "baik"` untuk query stok
- Payload retrieve saat ini tidak memiliki field `kondisi` atau `catatan_kondisi`

## Langkah 2 - Frontend
- Tambah state: `showOtherConditions`, `kondisiByItem`, `catatanKondisiByItem`, `overrideItemId`
- Modifikasi `getValidZonesForItem` untuk menerima kondisi yang diinginkan sebagai parameter
- Tambah toggle "Tampilkan kondisi lain" yang menampilkan semua zona dengan stok > 0
- Tambah `OverrideConfirmModal` untuk konfirmasi + alasan override kondisi
- Modifikasi `confirmSubmit` untuk menyertakan `kondisi` dan `catatan_kondisi` dalam payload

## Langkah 3 - Backend
- Tambah validasi: jika `kondisi` dikirim berbeda dari kondisi surat jalan, maka `catatan_kondisi` wajib diisi
- Gunakan `kondisi` dari payload untuk query stok (`searchKondisi`)
- Pesan error sudah jelas menyebutkan nama barang, kondisi yang dicari, zona, dan ringkasan stok lain
- Tidak ada operasi tulis baru di luar transaksi retrieve yang sudah ada

## Catatan
- Catatan override TIDAK disimpan ke database (tidak ada kolom baru dan tidak mengubah data yang ada)
- Kebutuhan: kolom baru di `stok_ledger` atau `surat_jalan_item` untuk menyimpan catatan override secara permanen
