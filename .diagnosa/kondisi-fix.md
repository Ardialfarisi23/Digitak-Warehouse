# Progress Fix: normalizeKondisi untuk reconciliation_upload_detail

## Nilai enum `kondisi_barang` (dari schema.prisma)
- `baik`
- `rusak_ringan`
- `rusak_berat`
- `tidak_sesuai_spek`
- `doa`

## Label mapping (dari frontend/lib/kondisi-barang.ts)
- `baik` -> "Baik"
- `rusak_ringan` -> "Rusak Ringan"
- `rusak_berat` -> "Rusak Berat"
- `tidak_sesuai_spek` -> "Tidak Sesuai Spek"
- `doa` -> "DOA"

## File + baris diubah

### `backend/src/modules/reports/reports.controller.js`
- **Baris 21-46**: Menambahkan helper `normalizeKondisi(value)` yang:
  - Menerima nilai mentah (label Indonesia, snake_case, dll)
  - Trim, lowercase, ganti spasi/tanda hubung jadi underscore
  - Mapping label Indonesia -> enum value
  - Return `null` jika tidak cocok/kosong
- **Baris 561, 597, 626, 654**: Ganti `kondisi: item.kondisi || null` menjadi `kondisi: normalizeKondisi(item.kondisi)` pada 4 jalur gagal `reconciliation_upload_detail.create()`.
- **Baris 683**: Ganti `kondisi: kondisi || item.kondisi || null` menjadi `kondisi: normalizeKondisi(kondisi || item.kondisi)` pada `laporan_mitra.create()`.
- **Baris 698**: Ganti `kondisi: kondisi || item.kondisi || null` menjadi `kondisi: normalizeKondisi(kondisi || item.kondisi)` pada jalur berhasil `reconciliation_upload_detail.create()`.
- **Baris 725**: Ganti `kondisi: kondisi || item.kondisi || null` menjadi `kondisi: normalizeKondisi(kondisi || item.kondisi)` pada jalur gagal catch `reconciliation_upload_detail.create()`.
- **Baris 765**: Ganti `kondisi: item.kondisi || null` menjadi `kondisi: normalizeKondisi(item.kondisi)` pada loop `failed` `reconciliation_upload_detail.create()`.

## Total perubahan
- 1 helper function baru
- 8 pemanggilan `kondisi` diperbaiki

## Cara tes
1. Upload file Excel rekonsiliasi dengan kolom "Kondisi" berisi label Indonesia (mis. "Baik", "Rusak Ringan").
2. Atau input manual dengan kondisi "Baik".
3. Klik "Simpan Laporan".
4. Cek modal Detail Upload Laporan Mitra → tabel Detail Baris → kolom Kondisi harus tampil badge dengan label yang benar.
5. Cek database: `SELECT kondisi FROM reconciliation_upload_detail WHERE detail_id = <id>` harus menampilkan nilai enum (`baik`, `rusak_ringan`, dll), bukan label.
