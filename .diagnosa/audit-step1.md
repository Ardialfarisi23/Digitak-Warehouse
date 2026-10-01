# Diagnosa Audit Log Step 1

## Ringkasan
Modal detail audit log saat ini menampilkan data mentah dari `data_sebelum`/`data_sesudah` berupa JSON di-stringify atau `String(value)` untuk nilai yang tidak ada di labelMap kecil di dalam `renderStructuredData`. Akibatnya kode seperti `must_change_password`, `ready_putaway`, `menunggu_verifikasi`, `diterima_didistribusikan` muncul mentah ke user. Data di database/API tidak perlu diubah, hanya perlu formatter label di frontend.

## Lokasi render + cara data ditampilkan saat ini
- **Komponen modal**: `frontend/app/dashboard/reports/page.tsx:713-771` (`Modal` + `TabAuditLog`).
- **Formatter data**: `frontend/app/dashboard/reports/page.tsx:372-450` (`renderStructuredData`).
- **Cara kerja saat ini**:
  - `aksi` sudah punya map `aksiMap` (line 67-87), fallback ke raw code.
  - `renderStructuredData` punya `labelMap` kecil (line 382-410) untuk ~20 key.
  - Key ID (tiket_id, surat_jalan_id, dst) di-resolve via `entity_refs_resolved`.
  - Nilai yang tidak dikenali: di-`JSON.stringify` kalau object, atau `String(value)` kalau primitive.
  - Tidak ada format boolean (true/false -> Ya/Tidak), tidak ada format status enum, tidak ada Title Case fallback.

## Struktur data audit log
- **Schema Prisma**: `backend/prisma/schema.prisma:597-610` — model `audit_log` dengan `data_sebelum Json?` dan `data_sesudah Json?`.
- ** Contoh struktur yang tercatat di backend (flat object, tidak nested)**:
  - `data_sebelum: { status: "draft_diajukan", must_change_password: true, role: "staf_gudang", is_aktif: true, status_aktif: false, catatan: "...", nomor_surat_jalan: "...", surat_jalan_id: 1, tiket_id: 1, gudang_asal_id: 1, gudang_tujuan_id: 2, project_id: 1, boq_id: 1, zona_id: 1, barang_id: 1, mos: 100, used: 80, remains_lapangan: 50, source_file: "x", username_target: "x", qty: "10", return_id: 1, items_updated: 2, updated_fields: ["status"], boq_number: "B-1", item_count: 3, override: true, kondisi_diminta: "baik", kondisi_diambil: "rusak_ringan", catatan_kondisi: "...", reason: "...", alasan_gagal: "...", latitude: ..., longitude: ..., nama_lokasi: "..." }`
- Tidak ada nested array/object yang sistematis di `data_sebelum`/`data_sesudah` untuk audit log (kecuali value occasional yang di-`JSON.stringify`).

## Tabel inventaris kode

| Kode | Asal | Kategori | Usulan label Indonesia |
|------|------|----------|------------------------|
| `create` | `backend/prisma/schema.prisma:856` | nilai action | Dibuat |
| `update` | `backend/prisma/schema.prisma:857` | nilai action | Diperbarui |
| `delete` | `backend/prisma/schema.prisma:858` | nilai action | Dihapus |
| `approve` | `backend/prisma/schema.prisma:859` | nilai action | Disetujui |
| `receive_inbound` | `backend/prisma/schema.prisma:860` | nilai action | Terima Inbound |
| `approve_inbound` | `backend/prisma/schema.prisma:861` | nilai action | Setujui Inbound |
| `approve_outbound` | `backend/prisma/schema.prisma:862` | nilai action | Setujui Outbound |
| `confirm_distributed` | `backend/prisma/schema.prisma:863` | nilai action | Dikonfirmasi |
| `reject_inbound` | `backend/prisma/schema.prisma:864` | nilai action | Tolak Inbound |
| `reject_outbound` | `backend/prisma/schema.prisma:865` | nilai action | Tolak Outbound |
| `putaway` | `backend/prisma/schema.prisma:866` | nilai action | Penyimpanan |
| `retrieve` | `backend/prisma/schema.prisma:867` | nilai action | Pengambilan Stok |
| `create_inbound` | `backend/prisma/schema.prisma:868` | nilai action | Buat Inbound |
| `create_outbound` | `backend/prisma/schema.prisma:869` | nilai action | Buat Outbound |
| `start_delivery` | `backend/prisma/schema.prisma:870` | nilai action | Mulai Pengiriman |
| `nonaktifkan_project` | `backend/prisma/schema.prisma:871` | nilai action | Project Dinonaktifkan |
| `aktifkan_project` | `backend/prisma/schema.prisma:872` | nilai action | Project Diaktifkan |
| `soft_delete` | `backend/prisma/schema.prisma:873` | nilai action | Dihapus (Soft) |
| `restore` | `backend/prisma/schema.prisma:874` | nilai action | Dipulihkan |
| `cancel_draft` | `backend/src/modules/surat-jalan/surat-jalan.service.js:1082` | nilai action | Batalkan Draft |
| `report_arrival` | `backend/src/modules/surat-jalan/surat-jalan.service.js:1671` | nilai action | Lapor Tiba |
| `draft_diajukan` | `backend/prisma/schema.prisma:787` | nilai status surat jalan | Draft |
| `menunggu_verifikasi` | `backend/prisma/schema.prisma:788` | nilai status surat jalan | Menunggu Verifikasi |
| `ready_putaway` | `backend/prisma/schema.prisma:789` | nilai status surat jalan | Siap Putaway |
| `disetujui` | `backend/prisma/schema.prisma:790` | nilai status surat jalan | Disetujui |
| `sedang_dikirim` | `backend/prisma/schema.prisma:791` | nilai status surat jalan | Sedang Dikirim |
| `tiba_menunggu_konfirmasi` | `backend/prisma/schema.prisma:792` | nilai status surat jalan | Menunggu Konfirmasi |
| `diterima_didistribusikan` | `backend/prisma/schema.prisma:793` | nilai status surat jalan | Diterima/Didistribusikan |
| `ditolak` | `backend/prisma/schema.prisma:794` | nilai status surat jalan | Ditolak |
| `digenerate` | `backend/prisma/schema.prisma:795` | nilai status surat jalan | Digenerate |
| `draft` | `backend/prisma/schema.prisma:757` | nilai status boq/return | Draft |
| `aktif` | `backend/prisma/schema.prisma:758` | nilai status boq | Aktif |
| `selesai` | `backend/prisma/schema.prisma:759` | nilai status boq | Selesai |
| `diajukan` | `backend/prisma/schema.prisma:775` | nilai status permintaan/return | Diajukan |
| `ditinjau` | `backend/prisma/schema.prisma:776` | nilai status permintaan boq | Ditinjau |
| `disetujui` | `backend/prisma/schema.prisma:777` | nilai status permintaan/return/approval | Disetujui |
| `diterima_gudang` | `backend/prisma/schema.prisma:815` | nilai status return | Diterima di Gudang |
| `menunggu` | `backend/prisma/schema.prisma:839` | nilai status approval/external | Menunggu |
| `terverifikasi` | `backend/prisma/schema.prisma:769` | nilai status external verifikasi | Terverifikasi |
| `tidak_berlaku` | `backend/prisma/schema.prisma:771` | nilai status external verifikasi | Tidak Berlaku |
| `berhasil` | `backend/prisma/schema.prisma:725` | nilai status reconciliation | Berhasil |
| `gagal` | `backend/prisma/schema.prisma:726` | nilai status reconciliation | Gagal |
| `CUKUP` | `backend/prisma/schema.prisma:845` | nilai status zona | Cukup |
| `MENDEKATI_PENUH` | `backend/prisma/schema.prisma:846` | nilai status zona | Mendekati Penuh |
| `TIDAK_CUKUP` | `backend/prisma/schema.prisma:847` | nilai status zona | Tidak Cukup |
| `admin_general` | `backend/prisma/schema.prisma:730` | nilai role | Admin General |
| `supervisor` | `backend/prisma/schema.prisma:731` | nilai role | Supervisor |
| `staf_gudang` | `backend/prisma/schema.prisma:732` | nilai role | Staf Gudang |
| `baik` | `backend/prisma/schema.prisma:799` | nilai kondisi barang | Baik |
| `rusak_ringan` | `backend/prisma/schema.prisma:800` | nilai kondisi barang | Rusak Ringan |
| `rusak_berat` | `backend/prisma/schema.prisma:801` | nilai kondisi barang | Rusak Berat |
| `tidak_sesuai_spek` | `backend/prisma/schema.prisma:802` | nilai kondisi barang | Tidak Sesuai Spek |
| `doa` | `backend/prisma/schema.prisma:803` | nilai kondisi barang | DOA |
| `must_change_password` | `backend/prisma/schema.prisma:17` | key boolean | Wajib Ganti Password |
| `is_aktif` | `backend/src/modules/titik-lapangan/titik-lapangan.service.js:127` | key boolean | Aktif |
| `status_aktif` | `backend/src/modules/projects/project.service.js:211` | key boolean | Status Aktif |
| `is_kelebihan` | `frontend/app/dashboard/reports/page.tsx:139` | key boolean | Kelebihan Kirim |
| `override` | `frontend/app/dashboard/reports/page.tsx:406` | key boolean | Override Kondisi |

## Util label yang sudah ada
- `aksiMap` (frontend/app/dashboard/reports/page.tsx:67) — map aksi -> label/icon/variant. Belum termasuk `cancel_draft` dan `report_arrival`.
- `statusLabel` (frontend/app/dashboard/reports/page.tsx:1019) — map `surat_jalan_status` -> label. Hanya untuk surat jalan.
- `STATUS_META` (frontend/app/staff/inbound/page.tsx:16 dan frontend/app/staff/outbound/[id]/page.tsx:14) — map `surat_jalan_status` -> label/tone. Duplikasi dengan `statusLabel`.
- `KONDISI_LABEL` + `getKondisiLabel` (frontend/lib/kondisi-barang.ts) — map `kondisi_barang` -> label.
- `getStatusLabel`/`getStatusBadgeClass` (frontend/lib/capacity.ts:27,14) — untuk `status_kecukupan_zona`, tidak untuk audit.
- `roleMap` (frontend/app/dashboard/reports/page.tsx:89) — map `user_role` -> label/variant.

**Tidak ada util terpusat untuk audit log.** Semua mapping tersebar dan sebagian besar tidak dipakai di dalam `renderStructuredData`.

## Rencana implementasi disarankan
1. **Buat util terpusat**: `frontend/lib/auditLabels.ts`
   - `FIELD_LABELS`: key -> label Indonesia (mis. `must_change_password` -> "Wajib Ganti Password", `role` -> "Peran", `is_aktif` -> "Aktif", `status_aktif` -> "Status Aktif", `override` -> "Override Kondisi", `kondisi_diminta` -> "Kondisi Diminta", dst.)
   - `VALUE_LABELS`: kelompokkan per entity/status type:
     - `SURAT_JALAN_STATUS`
     - `BOQ_STATUS`
     - `RETURN_STATUS`
     - `APPROVAL_STATUS`
     - `EXTERNAL_VERIFICATION_STATUS`
     - `PERMINTAAN_BOQ_STATUS`
     - `RECONCILIATION_STATUS`
     - `ZONA_CAPACITY_STATUS`
     - `USER_ROLE`
     - `KONDISI_BARANG`
     - `AUDIT_AKSI` (lengkapi `cancel_draft`, `report_arrival`)
   - `formatAuditValue(key, value)`: boolean -> Ya/Tidak; cocok di VALUE_LABELS -> pakai label; kalau tidak cocok -> Title Case fallback (snake_case -> "Title Case").
   - `formatAuditKey(key)`: pakai `FIELD_LABELS`, fallbackTitle Case.
   - Perkiraan ukuran: ~150-250 baris.

2. **Modifikasi `renderStructuredData`** di `frontend/app/dashboard/reports/page.tsx:372-450`
   - Ganti `labelMap[key] || key` dengan `formatAuditKey(key)`.
   - Ganti blok `displayValue` dengan `formatAuditValue(key, value)`.
   - Perkiraan perubahan: ~10-20 baris.

3. **Opsional**: Konsolidasikan `statusLabel` dan `STATUS_META` di page.tsx untuk menggunakan `VALUE_LABELS.SURAT_JALAN_STATUS` dari util baru, menghilangkan duplikasi.

4. **Backend**: Tidak diubah. `cancel_draft` dan `report_arrival` memang ada di Prisma enum? Tidak, `cancel_draft` dan `report_arrival` **tidak ada** di enum `audit_aksi` Prisma (`schema.prisma:855-875`), hanya ada sebagai string di kode surat-jalan.service.js. Ini adalah potensi inconsistency di backend, tapi di luar scope perubahan tampilan.

## Hal yang belum diketahui / butuh input
- Apakah ada entity/status lain di luar yang tercatat di atas yang mungkin muncul di audit log (mis. entity_type `personil`, `gudang`, `zona_gudang`, `barang`)?
- Apakah label yang diusulan di atas sudah sesuai dengan terminology bisnis yang dipakai user?
- Apakah ingin menampilkan diff visual (old vs new) untuk field tertentu, atau cukup label per field/value?
- Apakah `cancel_draft` dan `report_arrival` perlu ditambahkan ke enum Prisma `audit_aksi` di backend untuk konsistensi? (ini ubah database/backend, tidak di sini)
