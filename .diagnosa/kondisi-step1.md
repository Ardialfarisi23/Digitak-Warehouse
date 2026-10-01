# Diagnosa: Kondisi barang tidak tampil di modal Detail Upload Laporan Mitra

## Ringkasan

Modal "Detail Upload Laporan Mitra" di tab Riwayat Input Laporan Mitra membaca data dari tabel `reconciliation_upload_detail`, yang tidak memiliki kolom `kondisi` dan kolom detail lain (nama_barang, project, pic_mitra, tanggal_laporan, catatan). Data `kondisi` memang tersimpan di tabel `laporan_mitra`, tetapi tidak ada penghubung (link) antara `reconciliation_upload_detail` dengan `laporan_mitra`, sehingga modal tidak bisa menampilkannya.

## Alur data: simpan -> baca -> render

1. **Simpan** (`backend/src/modules/reports/reports.controller.js:462-731`)
   - `uploadReconciliationFile` mem-parsing Excel, membentuk `preview` yang menyertakan `kondisi` per baris (baris 387, 440).
   - `confirmReconciliationUpload` menerima `preview`, `kondisi`, dsb. dari `req.body` (baris 464-474).
   - Setiap baris berhasil disimpan ke `laporan_mitra` dengan `kondisi: kondisi || item.kondisi || null` (baris 627), tetapi saat menyimpan ke `reconciliation_upload_detail` (baris 633-643), kolom `kondisi` **TIDAK** dimasukkan.
   - Baris gagal juga disimpan ke `reconciliation_upload_detail` tanpa `kondisi` (baris 653-662).

2. **Baca** (`backend/src/modules/reports/reports.repository.js:1819-1908`)
   - `getReconciliationUploadLogs` query `reconciliation_upload_log` dengan `include: { details: { orderBy: { detail_id: "asc" } } }` (baris 1870-1872).
   - Tidak ada `include` untuk relasi `barang` atau apapun lain di `details`.
   - Mapping detail (baris 1889-1896) hanya mengambil: `detail_id`, `kode_tiket`, `mos`, `used`, `status`, `reason`. Tidak ada `kondisi`, `nama_barang`, `project`, `pic_mitra`, `tanggal_laporan`, `catatan`.

3. **Render** (`frontend/app/dashboard/reports/page.tsx:1732-1795`)
   - Modal "Detail Upload Laporan Mitra" membaca `detailRow.details` (baris 1762).
   - Tabel "Detail Baris" menampilkan kolom: Kode Tiket, MOS (arsip), Remains di Lapangan, Used, Status, Alasan Gagal (baris 1767-1772).
   - Tidak ada kolom Kondisi, Nama Barang, Project, Tanggal Laporan, PIC Mitra, Catatan.

## Titik data terputus + keyakinan

| Field | Titik terputus | Keyakinan |
|-------|---------------|----------|
| `kondisi` | Tidak ada kolom di `reconciliation_upload_detail`; backend simpan ke `laporan_mitra` saja; frontend query tidak mengambil dari `laporan_mitra` | **Tinggi** |
| `nama_barang` | Tidak ada kolom di `reconciliation_upload_detail`; `barang_id` ada tetapi tidak di-include saat query; frontend tidak render | **Tinggi** |
| `project` / `project_id` | Tidak ada kolom di `reconciliation_upload_detail`; tidak ada join ke `tiket_material`/`project` | **Tinggi** |
| `tanggal_laporan` | Hanya ada di `laporan_mitra`, tidak ada di `reconciliation_upload_detail` | **Tinggi** |
| `pic_mitra` | Hanya ada di `laporan_mitra`, tidak ada di `reconciliation_upload_detail` | **Tinggi** |
| `catatan` | Hanya ada di `laporan_mitra`, tidak ada di `reconciliation_upload_detail` | **Tinggi** |

**Kesimpulan:** Ada 6 field yang hilang. `kondisi` adalah yang paling utama karena diminta spesifik di tugas.

## Query SQL verifikasi

```sql
-- Cek struktur kolom reconciliation_upload_detail (tidak ada kondisi, nama_barang, project, pic, tanggal, catatan)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reconciliation_upload_detail'
ORDER BY ordinal_position;

-- Cek apakah data kondisi tersimpan di laporan_mitra untuk upload terbaru
SELECT lm.laporan_id, lm.kode_tiket, lm.kondisi, lm.nama_barang, lm.pic_mitra, lm.tanggal_laporan, lm.catatan, lm.uploaded_at
FROM laporan_mitra lm
ORDER BY lm.laporan_id DESC
LIMIT 5;

-- Cek apakah reconciliation_upload_detail punya link ke laporan_mitra (tidak ada)
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conrelid = 'reconciliation_upload_detail'::regclass;

-- Cek sample detail upload terbaru (kondisi akan NULL/missing)
SELECT d.detail_id, d.kode_tiket, d.mos, d.used, d.status, d.reason
FROM reconciliation_upload_detail d
ORDER BY d.detail_id DESC
LIMIT 5;
```

## Usulan tampilan modal

**Kolom tambahan di tabel Detail Baris:**
1. **Kondisi** — badge dengan label dari `KONDISI_LABEL` (`frontend/lib/kondisi-barang.ts`). Letak: antara Kode Tiket dan MOS, atau setelah Used.
2. **Nama Barang** — text biasa.
3. **Project** — text biasa (dapat di-derive dari `kode_tiket` + `tiket_material` + `project`).
4. **Tanggal Laporan** — text biasa.
5. **PIC Mitra** — text biasa.
6. **Catatan** — text biasa, tampilkan "-" jika kosong.

**Ukuran perubahan per file:**
- `frontend/app/dashboard/reports/page.tsx` — ubah interface `ReconciliationUploadLogEntry.details` (baris 158-168), tambah kolom di tabel modal (baris 1767-1772), dan mapping backend.
- `backend/src/modules/reports/reports.repository.js` — tambah `include` untuk `barang` di `details` (baris 1870-1872), map field-field baru di `rows` (baris 1889-1896).
- `backend/src/modules/reports/reports.controller.js` — tidak diubah (kondisi sudah disimpan ke `laporan_mitra`).
- `backend/prisma/schema.prisma` — tidak diubah (kondisi sudah ada di `laporan_mitra`).

**Catatan penting:** Karena `reconciliation_upload_detail` tidak menyimpan `kondisi`, `tanggal_laporan`, `pic_mitra`, `catatan`, ada 2 opsi:
- Opsi A: Tambah kolom-kolom tersebut ke `reconciliation_upload_detail` + simpan saat `confirmReconciliationUpload` (membutuhkan migrasi Prisma).
- Opsi B: Query `laporan_mitra` secara terpisah di backend untuk melengkapi detail, lalu gabungkan di frontend atau backend. `laporan_mitra` bisa di-join via `kode_tiket` + `tanggal_laporan` + `barang_id`, tetapi tidak ada `upload_id` di `laporan_mitra` sehingga join tidak langsung.

Opsi B lebih aman tanpa migrasi, tetapi butuh logika penggabungan yang hati-hati. Opsi A lebih bersih tetapi butuh migrasi.

## Rencana perbaikan bertahap (belum dieksekusi)

**Langkah 1 — Backend baca (tanpa migrasi, Opsi B):**
1. Di `reports.repository.js`, ubah query `details` agar include `barang` (untuk nama_barang).
2. Tambah query terpisah ke `laporan_mitra` untuk mendapatkan `kondisi`, `tanggal_laporan`, `pic_mitra`, `catatan`, `project_id` berdasarkan `kode_tiket` + `barang_id` + `uploaded_at` (rentang waktu upload_log).
3. Gabungkan data `laporan_mitra` ke `details` di memory sebelum mapping ke JSON.
4. Map field-field baru di `rows`.

**Langkah 2 — Frontend render:**
1. Perluas interface `ReconciliationUploadLogEntry.details` dengan field-field baru (opsional, dengan fallback "-").
2. Tambah kolom-kolom baru di tabel modal.
3. Gunakan `getKondisiLabel()` dari `frontend/lib/kondisi-barang.ts` untuk badge Kondisi.
4. Tambah fallback "-" untuk field yang kosong (mengantisipasi data lama yang tidak punya kondisi).

**Langkah 3 — Verifikasi:**
1. Query SQL verifikasi (lihat di atas).
2. Cek modal menampilkan badge Kondisi dan detail lengkap untuk upload terbaru.
3. Cek data lama tetap tampil tanpa error (fallback "-").

## Hal yang belum diketahui / butuh input saya

1. Apakah `kondisi` seharusnya disimpan per `reconciliation_upload_detail` (Opsi A, perlu migrasi) atau cukup diambil dari `laporan_mitra` (Opsi B)?
2. Apakah satu baris upload bisa memiliki beberapa `kondisi` berbeda? Dari Excel, kolom Kondisi adalah satu nilai per baris, jadi kemungkinan satu baris = satu kondisi. Tetapi perlu konfirmasi dari business logic.
3. Apakah data lama (sebelum fix) memang tidak memiliki `kondisi` di `reconciliation_upload_detail`, sehingga fallback "-" sudah cukup?
4. Apakah ada batasan waktu (rentang `uploaded_at`) yang bisa digunakan untuk join `laporan_mitra` dengan `reconciliation_upload_detail`? Karena tidak ada `upload_id` di `laporan_mitra`, join akan based on `kode_tiket` + `barang_id` + `tanggal_laporan` yang kurang presisi jika ada multiple upload untuk tiket yang sama.
