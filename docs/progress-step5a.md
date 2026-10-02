# Progress Step 5a — Diagnosa Rekonsiliasi

**Tanggal:** 2026-09-29  
**Branch:** refactor/outbound-picking-smart-retrieve-and-distribution-flow

---

## B1. Peta File Inti

| File | Peran |
|------|-------|
| `backend/src/modules/reconciliation/reconciliation.routes.js:10-15` | Route `GET /inventory` |
| `backend/src/modules/reconciliation/reconciliation.controller.js:4-12` | Controller `getInventory` |
| `backend/src/modules/reconciliation/reconciliation.service.js:28-30` | Service wrapper |
| `backend/src/modules/reconciliation/reconciliation.repository.js:6-310` | **Logic inti rekonsiliasi** |
| `backend/src/modules/reconciliation/reconciliation.utils.js:17-59` | `computeRemains`, `computeReconciliationStatus`, `aggregateProjectStatus` |
| `frontend/app/dashboard/page.tsx:252-312` | UI dashboard, fetch `/api/reconciliation/inventory` |

---

## B2. Pemicu

Rekonsiliasi dihitung **on-the-fly** setiap kali `GET /api/reconciliation/inventory` dipanggil (`reconciliation.repository.js:6`).  
Tidak ada trigger otomatis setelah SPV konfirmasi barang sampai, tidak ada tombol "hitung rekonsiliasi", dan tidak dijalankan per SJ.  
Syarat data: SJ outbound harus berstatus `disetujui` atau `diterima_didistribusikan` (`reconciliation.repository.js:78`).

---

## B3. Sumber Data

Rekonsiliasi saat ini **TIDAK** memakai:
- `surat_jalan_item_pick` (baris pick aktual)
- Kondisi barang (`kondisi_diminta` / `kondisi_diambil`)
- Data override (`is_override`, `catatan_override`)
- Stok gudang (`stok_gudang.qty`)

Sumber yang dipakai (`reconciliation.repository.js:86-173`):
- `boq_item.qty_rencana` → **BOQ plan**
- `surat_jalan_item.qty` (inbound/outbound) → **additional** (kelebihan inbound) dan **MOS/used** (outbound ke non-gudang)
- `laporan_mitra.used` (aggregated per ticket+barang) → **used**
- Return module: `getLatestPhysicalSnapshot` + `getApprovedReturnsAfterSnapshot` → **approved_return_qty**

Rumus: `remains = MOS - (BOQ + additional)` (`reconciliation.utils.js:18-19`).  
`used` dihitung dari `laporan_mitra.used`, bukan dari qty picking.

---

## B4. Perhitungan

- **Rumus:** `remains = MOS - (BOQ + additional)` (`reconciliation.utils.js:18-19`).
- **MOS:** jumlah qty outbound SJ dengan `tujuan_tipe !== "gudang"` (`reconciliation.repository.js:120-123`).
- **Used:** agregasi `laporan_mitra.used` per ticket+barang (`reconciliation.repository.js:146-186`).
- **Satuan:** angka Decimal/number, tanpa pembulatan khusus.
- **Transaksi DB:** tidak ada — seluruh perhitungan adalah SELECT queries + in-memory aggregation.

---

## B5. Hasil

- **Tidak disimpan di tabel** — dihitung on-the-fly setiap request.
- **Idempotent:** setiap panggilan menghitung ulang dari data sumber, tidak ada side effect.
- **Dampak double run:** tidak ada (hanya read).

---

## B6. Data Lama

Query di DB dev: **6 SJ outbound** sudah `picking_selesai=true` tapi tidak punya baris di `surat_jalan_item_pick` (karena di-pick sebelum Step 4). Hanya 1 pick row yang ada (dari testing Step 4).

**Usulan fallback untuk Step 5b:**
- Untuk SJ tanpa baris pick: gunakan `surat_jalan_item.qty` sebagai proxy actual qty (seperti saat ini), tapi tambahkan flag `requires_verification = true`.
- Atau: hitung `used` dari `surat_jalan_item_pick` jika ada, fallback ke `surat_jalan_item.qty` jika tidak.

---

## B7. Rencana Step 5b

### Langkah 1 — Sumber data aktual picking (prioritas tinggi)
- **File:** `reconciliation.repository.js`, `reconciliation.utils.js`
- **Ringkasan:** Ubah sumber `used` dari `laporan_mitra.used` menjadi agregasi `surat_jalan_item_pick.qty` per project+barang. Fallback ke `surat_jalan_item.qty` untuk SJ lama tanpa pick rows.
- **Risiko:** Medium — mengubah angka rekonsiliasi yang sudah ditampilkan di dashboard.
- **Migration:** tidak perlu (tabel pick sudah ada).
- **UI:** perlu update dashboard/reports untuk menampilkan sumber data aktual.

### Langkah 2 — Kondisi & override (prioritas medium)
- **File:** `reconciliation.repository.js`, `reconciliation.utils.js`
- **Ringkasan:** Tambah kolom `kondisi_diambil` dan `is_override` ke output rekonsiliasi. Tandai baris yang involving override sebagai "perhatian".
- **Risiko:** Medium — tambah field baru di response API, perlu update UI.
- **Migration:** tidak perlu (kolom sudah ada di `surat_jalan_item_pick`).
- **UI:** perlu update dashboard/reports untuk menampilkan kondisi dan flag override.

### Langkah 3 — Validasi & idempotensi (prioritas rendah)
- **File:** `reconciliation.repository.js`
- **Ringkasan:** Tambah snapshot/checksum per hitungan rekonsiliasi agar bisa di-audit dan di-compare antar waktu.
- **Risiko:** Rendah — cuma tambah metadata.
- **Migration:** perlu tabel baru `reconciliation_snapshot` atau kolom di tabel existing.
- **UI:** opsional.

---

## Catatan

- `surat_jalan_item_pick` belum dibaca di rekonsiliasi sama sekali.
- Kondisi barang dan override tidak diperhitungkan dalam rumus `remains`.
- Data rekonsiliasi sepenuhnya on-the-fly, tidak ada tabel hasil tersimpan.
