# PROGRESS PICKING UI

## Langkah 1 - Temuan
- Toggle "Tampilkan kondisi lain" ada di kode (baris 839-846) tetapi TIDAK pernah dirender karena early return di baris 766-773.
- Ketika `validZones.length === 0 && !showOtherConditions`, code langsung return JSX teks "Tidak ada stok kondisi X" + "Tersedia: ..." tanpa menampilkan toggle.
- Akibatnya staf tidak bisa mengaktifkan toggle untuk melihat kondisi lain.

## Langkah 2 - Perbaikan UI
- File: `frontend/app/staff/outbound/[suratJalanId]/picking/page.tsx`
- Ubah early return agar tetap menampilkan toggle ketika `otherKondisi` tersedia
- Saat toggle diaktifkan, dropdown menampilkan semua zona dengan stok > 0 (berbagai kondisi)
- Saat pilih zona dengan kondisi lain, dialog konfirmasi override tetap muncul (sudah ada dari TUGAS 2C)
- Perbaiki display qty di dropdown ketika menampilkan kondisi lain

## Langkah 3 - Backend
- Tidak diubah (sudah diubah di tugas sebelumnya untuk menghapus filter kondisi)
