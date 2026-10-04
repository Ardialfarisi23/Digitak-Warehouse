# Progress Step 2A: Tambah kolom snapshot ke reconciliation_upload_detail

## File + baris yang diubah

### 1. `backend/prisma/schema.prisma:628-644`
Menambahkan 7 kolom nullable pada model `reconciliation_upload_detail`:
- `kondisi` (kondisi_barang?)
- `nama_barang` (String? @db.Text)
- `kode_barang` (String? @db.Text)
- `project_nama` (String? @db.Text)
- `tanggal_laporan` (DateTime?)
- `pic_mitra` (String? @db.Text)
- `catatan` (String? @db.Text)

### 2. `backend/src/modules/reports/reports.controller.js`
- Baris 514-517: tambah `project: { select: { nama_project: true } }` pada query tiket pertama.
- Baris 541-550: tambah `project: { select: { nama_project: true } }` pada query tiket kedua.
- Baris 591-594: tambah `include: { barang: { select: { kode_perangkat: true } } }` pada query BOQ untuk mendapatkan `kode_barang`.
- Baris 525-535, 553-563, 575-585, 596-606, 633-643, 653-663, 686-696: tambah 7 kolom snapshot pada setiap `tx.reconciliation_upload_detail.create()`.

### 3. `backend/src/modules/reports/reports.repository.js`
- Baris 1870-1882: tambah `select` untuk 7 kolom baru di `details`.
- Baris 1889-1906: tambah mapping untuk 7 kolom baru di `details.map()`.

## Daftar kolom baru
1. `kondisi` — enum `kondisi_barang`, nullable
2. `nama_barang` — String, nullable, @db.Text
3. `kode_barang` — String, nullable, @db.Text (dari `barang.kode_perangkat`)
4. `project_nama` — String, nullable, @db.Text (dari `tiket.project.nama_project`)
5. `tanggal_laporan` — DateTime, nullable
6. `pic_mitra` — String, nullable, @db.Text
7. `catatan` — String, nullable, @db.Text

## Perintah migrasi (untuk Anda jalankan sendiri)
```bash
cd D:\Project\digitak-warehouse\backend
npx prisma migrate dev --name add_snapshot_to_upload_detail
```

## Verifikasi yang sudah dilakukan
- `npx prisma validate` — **LULUS** (schema valid)
- `npx prisma generate` — **GAGAL** karena file `query_engine-windows.dll.node` dikunci proses Node.js lain di Windows (EPERM). Ini masalah OS, bukan schema. Jalankan `npx prisma generate` setelah memastikan tidak ada proses backend berjalan, atau restart komputer.
- Sintaks `reports.controller.js` dan `reports.repository.js` — **OK** (dicek dengan `node -e "new Function(...)"`)

## Cara tes manual
1. Jalankan migrasi: `npx prisma migrate dev --name add_snapshot_to_upload_detail`
2. Jalankan `npx prisma generate` (setelah proses Node lain dihentikan).
3. Upload file Excel rekonsiliasi baru via UI (`/dashboard/reports` tab Riwayat Input Laporan Mitra).
4. Klik ikon mata pada baris upload baru → modal "Detail Upload Laporan Mitra".
5. Cek tabel "Detail Baris": setiap baris harus menampilkan kolom Kondisi, Nama Barang, Kode Barang, Project, Tanggal Laporan, PIC Mitra, Catatan.
6. Untuk data lama (sebelum migrasi), kolom baru akan NULL → frontend perlu menampilkan "-" (akan dihandle di Step 2B/frontend).

## Catatan
- Kolom baru semua nullable, jadi baris lama tetap valid tanpa backfill.
- `kode_barang` diisi dari `boq.items[0].barang.kode_perangkat` saat BOQ ditemukan; untuk baris gagal sebelum BOQ check, `kode_barang` = null.
- `project_nama` diisi dari `tiket.project.nama_project`; untuk baris gagal sebelum tiket ditemukan, `project_nama` = null.
