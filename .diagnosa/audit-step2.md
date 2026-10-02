# Diagnosa Audit Log Step 2

## Ringkasan
File `frontend/lib/audit-labels.ts` sudah dibuat. Tidak ada file lain yang diubah. Type check `tsc --noEmit` di direktori `frontend` lulus tanpa error.

## Kelompok enum yang dicakup
1. `audit_aksi` (19 nilai + 2 tambahan: `cancel_draft`, `report_arrival`)
2. `surat_jalan_status` (9 nilai)
3. `boq_status` (4 nilai)
4. `return_status` (5 nilai)
5. `approval_status` (3 nilai)
6. `kondisi_barang` (5 nilai)
7. `user_role` (3 nilai)
8. `status_kecukupan_zona` (3 nilai)
9. `external_verification_status` (3 nilai)
10. `permintaan_boq_status` (4 nilai)
11. `reconciliation_detail_status` (2 nilai)

## Kode yang labelnya ditebak / butuh review
- **boq_status**: `aktif` -> "Aktif", `selesai` -> "Selesai", `draft` -> "Draft". Sumber: tab BOQ di `frontend/app/dashboard/boq/page.tsx` pakai "Aktif"/"Selesai"/"Draft". Label konsisten dengan konteks lain.
- **return_status**: `draft` -> "Draft", `diajukan` -> "Diajukan", `diterima_gudang` -> "Diterima di Gudang". Tidak ada mapping frontend yang eksplisit untuk return_status; ini inferensi dari nama enum.
- **approval_status**: `menunggu` -> "Menunggu". Di beberapa tempat frontend pakai "Menunggu Persetujuan", tapi untuk approval log singkat "Menunggu" lebih aman.
- **external_verification_status**: `terverifikasi` -> "Terverifikasi", `tidak_berlaku` -> "Tidak Berlaku". Tidak ada mapping frontend eksplisit.
- **permintaan_boq_status**: `ditinjau` -> "Ditinjau". Tidak ada mapping frontend eksplisit.

## Contoh input -> output

| Input | Output | Keterangan |
|-------|--------|------------|
| `humanizeKey("must_change_password")` | `"Wajib Ganti Password"` | Key terdaftar di FIELD_LABELS |
| `humanizeValue("must_change_password", true)` | `"Ya"` | Boolean aktual |
| `humanizeValue("status", "ready_putaway")` | `"Siap Putaway"` | Nilai terdaftar di VALUE_LABELS.surat_jalan_status |
| `humanizeValue("status", "diterima_didistribusikan")` | `"Diterima/Didistribusikan"` | Konsisten dengan statusLabel yang lama |
| `humanizeValue("created_at", "2026-08-14T10:30:00Z")` | `"14/08/2026 10:30:00"` atau `"14 Agustus 2026 10.30.00"` | Tergantung runtime; format id-ID dengan jam |
| `humanizeValue("qty", 1500)` | `"1.500"` | Number -> toLocaleString('id-ID') |
| `humanizeValue("tags", ["a", "b", "c"])` | `"a, b, c"` | Array primitif digabung dengan ", " |
| `humanizeValue("unknown_field", "some_value")` | `"Some Value"` | Fallback Title Case |
| `humanizeValue("status", "kode_barang")` | `"Kode Barang"` | Tidak terdaftar di VALUE_LABELS -> Title Case |

## Catatan teknis
- File baru: `frontend/lib/audit-labels.ts` (~180 baris).
- Tidak ada dependensi baru; hanya pure functions dan constants.
- `BOOLEAN_FIELDS` berisi 5 key: `must_change_password`, `is_aktif`, `status_aktif`, `is_kelebihan`, `override`.
- `VALUE_LABELS` menggunakan pencarian case-insensitive sebagai fallback sebelum Title Case.
- `humanizeValue` untuk object/array objek tetap fallback ke `JSON.stringify` agar tidak kehilangan data.
