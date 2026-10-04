# Progress Badge Riwayat 2: Perbaikan tampilan lanjutan

## File + baris diubah

### `frontend/app/dashboard/reports/page.tsx`

1. **Baris 1583-1595**: Tambah helper `renderFilename(filename)` untuk reuse badge Nama File di tabel daftar dan modal.
2. **Baris 1680**: Ganti inline logic tabel daftar menjadi `{renderFilename(r.filename)}`.
3. **Baris 1765-1767**: Modal Nama File memakai `renderFilename(detailRow.filename)`.
4. **Baris 1772-1778**: Modal Diunggah Oleh menambahkan badge role kecil di bawah nama menggunakan `humanizeValue("user_role", detailRow.uploaded_by_role)`.
5. **Baris 1807-1815**: Sub-baris detail di modal:
   - Nama barang dengan label "Nama:"
   - Kode barang sebagai badge monospace terpisah (`<code className="font-mono ...">`)
   - Project dengan label "Project:"
   - PIC dengan label "PIC:"
   - Tanggal dengan label "Tgl:"
   - Catatan dengan label "Catatan:"
6. **Baris 1574-1580**: `statusBadge()` sudah menangani semua status (berhasil, gagal, sebagian_gagal, draft, tak dikenal).

## Hasil type check
- `npx tsc --noEmit` — **LULUS** tanpa error.

## Catatan
- Tabel daftar dan modal sekarang reuse logic badge Nama File yang sama.
- Role badge di modal hanya tampil jika `uploaded_by_role` tersedia.
- Sub-baris detail hanya menampilkan field yang terisi, dengan label prefix yang jelas.
- Kode barang ditampilkan sebagai badge monospace kecil, terpisah dari nama barang.
