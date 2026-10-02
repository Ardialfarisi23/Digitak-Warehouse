# Diagnosa Audit Log Step 2B

## Ringkasan
`renderStructuredData` di `frontend/app/dashboard/reports/page.tsx` sudah diganti menggunakan `humanizeKey` dan `humanizeValue` dari `frontend/lib/audit-labels.ts`. Kolom aksi di tabel dan modal detail audit log juga diperbarui fallback label-nya. Type check `tsc --noEmit` lulus tanpa error.

## File + baris yang diubah
1. `frontend/app/dashboard/reports/page.tsx:25` — tambah import `humanizeKey`, `humanizeValue` dari `@/lib/audit-labels`.
2. `frontend/app/dashboard/reports/page.tsx:373-488` — ganti seluruh body `renderStructuredData`:
   - Hapus `labelMap` lokal.
   - Key tampil via `humanizeKey(key)`.
   - Value tampil via `humanizeValue(key, value)` dengan dukungan rekursif untuk object nested dan array berisi object.
   - Tetap pertahankan `entity_refs_resolved` untuk ID keys.
3. `frontend/app/dashboard/reports/page.tsx:650-657` — fallback label aksi di tabel audit log kini menggunakan `humanizeValue("aksi", r.aksi)`.
4. `frontend/app/dashboard/reports/page.tsx:737-742` — fallback label aksi di modal detail audit log kini menggunakan `humanizeValue("aksi", detailRow.aksi)`.
5. `frontend/lib/audit-labels.ts:1-52` — tambah `picking_selesai: "Picking Selesai"` ke `FIELD_LABELS`.
6. `frontend/lib/audit-labels.ts:143-149` — tambah `picking_selesai` ke `BOOLEAN_FIELDS`.

## Key boolean yang ditambahkan
- `picking_selesai` — diambil dari model `surat_jalan` di `backend/prisma/schema.prisma:443`. Belum terlihat di audit log backend saat ini, tetapi ditambahkan sebagai *precautionary* karena `surat_jalan` adalah entity yang paling sering diaudit.

## Cara tes manual
1. Buka `frontend/app/dashboard/reports/page.tsx` pada tab Audit Log.
2. Klik salah satu baris audit log untuk membuka modal detail.
3. Pastikan:
   - Field `must_change_password` menampilkan "Ya" / "Tidak".
   - Field `status` dengan nilai `ready_putaway` menampilkan "Siap Putaway".
   - Field `status` dengan nilai `menunggu_verifikasi` menampilkan "Menunggu Verifikasi".
   - Field `status` dengan nilai `diterima_didistribusikan` menampilkan "Diterima/Didistribusikan".
   - Aksi `cancel_draft` menampilkan "Batalkan Draft" (jika ada data).
   - Aksi `report_arrival` menampilkan "Lapor Tiba" (jika ada data).
   - Nilai tanggal ISO (mis. `created_at`) menampilkan format tanggal Indonesia dengan jam.
   - Nilai number (mis. `qty`) menampilkan format `id-ID` (`1.500`).
   - Tidak ada kode `snake_case` mentah yang muncul di modal.
4. Jika ada nested object/array di `data_sebelum`/`data_sesudah`, pastikan ditampilkan sebagai blok berlabel, bukan `JSON.stringify`.
