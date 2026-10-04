# Progress Step 2A: Tambah fallback asal di Riwayat Stok

## File + baris diubah

### `backend/src/modules/reports/reports.repository.js`

1. **getStockHistory** (sekitar baris 431-627):
   - Tambah `supplier` include di `surat_jalan` (baris 434-438)
   - Tambah `return_transaction` include di `stok_ledger` (baris 477-498)
   - Tambah helper `resolveAsal(row)` (baris 504-563)
   - Tambah `asal_label` dan `asal_tipe` di mapping rows (baris 574, 611-612)

2. **getStockHistoryForExport** (sekitar baris 640-945):
   - Tambah `supplier` include di `surat_jalan` (baris 772-776)
   - Tambah `return_transaction` include di `stok_ledger` (baris 808-832)
   - Tambah helper `resolveAsal(row)` (baris 838-896)
   - Tambah `asal_label` dan `asal_tipe` di mapping rows (baris 904, 940-941)

## Field sumber per tipe

### INBOUND
1. `surat_jalan.gudang_asal.nama_gudang` -> `asal_tipe: "gudang"`
2. Jika null dan `tipe_pengirim === "external"`: `supplier.nama` atau `pengirim_eksternal_nama` -> `asal_tipe: "pemasok"`
3. Jika masih null: `project.nama_project` -> `asal_tipe: "project"`
4. Jika tetap null: `asal_label: null`, `asal_tipe: null`

### OUTBOUND
1. `surat_jalan.gudang_asal.nama_gudang` -> `asal_tipe: "gudang"`
2. Jika null: `surat_jalan_item.zona.gudang.nama_gudang` -> `asal_tipe: "gudang_stok"`
3. Jika tetap null: `asal_label: null`, `asal_tipe: null`

### RETURN
1. `return_transaction.surat_jalan_item.zona.gudang.nama_gudang` -> `asal_tipe: "return"`
2. Jika null: `return_transaction.project.nama_project` -> `asal_tipe: "project"`
3. Jika tetap null: `asal_label: null`, `asal_tipe: null`

### Tipe lain
- Gunakan `surat_jalan.gudang_asal.nama_gudang` jika ada -> `asal_tipe: "gudang"`
- Jika null: `asal_label: null`, `asal_tipe: null`

## Kasus yang tetap null
- INBOUND eksternal tanpa `gudang_asal_id`, tanpa `supplier`, dan tanpa `project`
- OUTBOUND tanpa `gudang_asal_id` dan tanpa `zona_id` pada item
- RETURN tanpa `surat_jalan_item_id` dan tanpa `project`
- Tipe lain tanpa `gudang_asal_id`

## Query SQL verifikasi (tulis saja, jangan eksekusi)

```sql
-- Bandingkan jumlah baris dengan asal_label NULL sebelum vs sesudah
-- (hanya untuk baris yang sekarang punya surat_jalan dengan tipe_pengirim external + supplier/project)
SELECT 
  COUNT(*) AS total_rows,
  COUNT(CASE WHEN sj.gudang_asal_id IS NULL THEN 1 END) AS gudang_asal_null,
  COUNT(CASE WHEN sj.tipe_pengirim = 'external' THEN 1 END) AS eksternal_count
FROM stok_ledger sl
JOIN surat_jalan_item sji ON sl.surat_jalan_item_id = sji.item_id
JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
WHERE sj.tipe = 'inbound';

-- Cek return_transaction yang punya zona gudang
SELECT 
  rt.return_id,
  rt.surat_jalan_item_id,
  sji.zona_id,
  g.nama_gudang
FROM return_transaction rt
JOIN surat_jalan_item sji ON rt.surat_jalan_item_id = sji.item_id
JOIN zona z ON sji.zona_id = z.zona_id
JOIN gudang g ON z.gudang_id = g.gudang_id
LIMIT 5;
```

## Cara tes
1. Panggil `GET /api/reports/stock-history` dan cek field `asal_label` + `asal_tipe` di response.
2. Coba filter inbound eksternal yang tadinya `gudang_asal: "-"` dan pastikan `asal_label` sekarang berisi nama supplier/project.
3. Coba filter return yang tadinya kosong dan pastikan `asal_label` berisi nama gudang/project.
4. Export Excel dan pastikan kolom baru ikut tampil.
