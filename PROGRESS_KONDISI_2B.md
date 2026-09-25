# PROGRESS KONDISI 2B

## Langkah 1 - Riset
- Halaman approval outbound (`frontend/app/dashboard/supervisor/approval/outbound/[id]/page.tsx`) menampilkan:
  - Panel kiri: daftar item surat jalan via komponen `DetailSuratJalanDocument` (kolom: No, Kode Barang, Nama Barang, QTY, UOM, Keterangan, Aksi)
  - Panel kanan: data stok gudang yang sudah difetch via `stock-snapshot` per zona, digabung menjadi `warehouseStock`
- Data `warehouseStock` dari TUGAS 2A sudah membawa field `kondisi` per baris.
- Item surat jalan memiliki `barang_id`, `qty`, dan `kondisi` (default "baik").

## Langkah 2 - Hitung kecukupan
- Perhitungan dilakukan di frontend dari data yang sudah di-fetch (`warehouseStock` + `request.items`).
- Untuk tiap item: cari stok dengan `barang_id` SAMA dan `kondisi` SAMA persis, jumlahkan `qty`, bandingkan dengan `qty` diminta.
- Status: "Cukup" (>=), "Kurang" (>0 tapi <), "Tidak Tersedia" (=0).
- Jika kurang/tidak tersedia, tampilkan ringkasan stok kondisi lain yang tersedia.

## Langkah 3 - Tampilan
- Tambah badge status di kolom "Keterangan" pada `DetailSuratJalanDocument`.
- Warna: Cukup=hijau, Kurang=amber, Tidak Tersedia=merah.
- Tambah prop `stockStatusByItemId` pada `DetailSuratJalanDocument` agar tidak mengubah perilaku default.
