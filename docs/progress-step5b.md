# Progress Step 5b — Rekonsiliasi Additive & Drift Doc

**Tanggal:** 2026-09-29  
**Branch:** refactor/outbound-picking-smart-retrieve-and-distribution-flow

---

## 0. Konfirmasi & Baseline

- **Pemicu:** on-the-fly setiap `GET /api/reconciliation/inventory` (`reconciliation.repository.js:6`), tanpa trigger otomatis.
- **Rumus:** `remains = MOS - (BOQ + additional)` (`reconciliation.utils.js:18-19`).
- **Sumber data:** `boq_item.qty_rencana`, `surat_jalan_item.qty`, `laporan_mitra.used`, return snapshot.
- **Idempotensi:** ya, pure read.
- **File inti:** `reconciliation.repository.js:6-310`, `reconciliation.utils.js:17-59`.

**0.2** Retrieve menulis ke `stok_ledger`: **Ya** (`surat-jalan.service.js:1268-1276`). Qty ledger sama dengan qty pick.

**0.3** BOM di HEAD: **Tidak ada** (3 byte pertama: `2D 2D 20`). Commit `78d71a6` tidak menghilangkan BOM (memang tidak ada sejak `bbc3716`). Drift sebelumnya disebabkan oleh false positive encoding.

**0.4** Baseline disimpan ke `tmp/recon-before.json` (60 items). Field lama identik setelah perubahan.

**0.5** Audit_log retrieve untuk SJ legacy memuat `kondisi_diambil` dan `qty`. Contoh: SJ 36, item 68: `kondisi_diminta=baik`, `kondisi_diambil=rusak_ringan`, `qty=30`, `override=true`. Tidak ada baris di `surat_jalan_item_pick` untuk 6 SJ legacy.

---

## A. Naming Constraint

- Migrate diff untuk `surat_jalan_item_pick` kini hanya menampilkan `DROP DEFAULT` untuk `kondisi_diminta`, `kondisi_diambil`, `qty`. Tidak ada RENAME CONSTRAINT lagi.
- Nama constraint/index di DB:
  - PK: `surat_jalan_item_pick_pick_id_pkey`
  - FK: `surat_jalan_item_pick_surat_jalan_item_id_fkey`
  - Index: `surat_jalan_item_pick_surat_jalan_item_id_idx`
- Schema.prisma diperbarui dengan `@@id([pick_id], map: "surat_jalan_item_pick_pick_id_pkey")` dan `@@index([surat_jalan_item_id], map: "surat_jalan_item_pick_surat_jalan_item_id_idx")`.
- `prisma validate` dan `prisma generate` lolos.

**Drift lain yang tercatat (tidak diperbaiki):**
- `stok_ledger`: DROP/ADD FK `stok_ledger_surat_jalan_item_id_fkey`
- `reconciliation_upload_detail`: DROP/ADD FK `reconciliation_upload_detail_upload_id_fkey`
- `boq`: ADD FK `boq_cluster_id_fkey`
- `surat_jalan_item_pick`: DROP DEFAULT untuk 3 kolom

---

## B. Rekonsiliasi Additive

### Perubahan

**`backend/src/modules/reconciliation/reconciliation.utils.js`**
- Tambah `buildPickSummary(rows, sjQty)` yang mengembalikan:
  - `pick_source`: `'pick'` atau `'legacy'`
  - `qty_picked_total`: `Number` atau `null`
  - `pick_breakdown`: array `{ kondisi, qty, is_override }`
  - `qty_override_total`: `Number` atau `null`
  - `pick_mismatch`: boolean

**`backend/src/modules/reconciliation/reconciliation.repository.js`**
- Query `surat_jalan_item_pick.groupBy` per `surat_jalan_item_id`, `kondisi_diambil`, `is_override`, `_sum.qty`.
- Agregasi per project+barang key, gabungkan dengan `shipmentItems`.
- Tambah field-field baru ke setiap row rekonsiliasi (additive, field lama tidak berubah).

### Verifikasi Regresi

- Diff `recon-before.json` vs `recon-after.json`: **semua field lama identik**.
- Field baru untuk SJ legacy (id `1-6`):
  ```json
  {
    "pick_source": "legacy",
    "qty_picked_total": null,
    "pick_breakdown": [],
    "qty_override_total": null,
    "pick_mismatch": false
  }
  ```
- SJ-OUT-2026-002 **tidak muncul** di rekonsiliasi karena barang `39` tidak ada di BOQ project `7`. Tidak ada contoh `pick_source: 'pick'` di data dev saat ini.

### Test

- `reconciliation.utils.test.js`: 5/5 passed (`buildPickSummary`).

---

## C. Catatan Drift DB Dev

Dokumentasi drift disimpan di `docs/drift-db-dev.md`.

---

## Belum Selesai

- Perlu decision: apakah drift lain (FK `stok_ledger`, `reconciliation_upload_detail`, `boq_cluster_id`, DROP DEFAULT) diperbaiki sekarang atau dilaporkan sebagai terpisah?
- Tidak ada contoh `pick_source: 'pick'` di data dev. Perlu create data testing atau menunggu data nyata.
