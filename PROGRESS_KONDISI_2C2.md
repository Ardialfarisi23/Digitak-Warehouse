# PROGRESS KONDISI 2C2

## Langkah 1 - Pelajari audit_log
- Model: `audit_log` dengan kolom: `audit_id` (BigInt, PK), `entity_type` (String), `entity_id` (BigInt), `aksi` (enum `audit_aksi`), `actor_id` (BigInt), `data_sebelum` (Json?), `data_sesudah` (Json?), `created_at` (DateTime), `actor` (relation ke `user_account`)
- Pola penulisan di project: `tx.audit_log.create({ data: { entity_type: "surat_jalan", entity_id: BigInt(id), aksi: "retrieve", actor_id: BigInt(actorId), data_sebelum: {...}, data_sesudah: {...} } })`
- Proses retrieve sudah menulis audit_log di `surat-jalan.service.js:1134` untuk status overall, tetapi belum menulis per baris picking.

## Langkah 2 - Tulis jejak audit per baris picking
- Ditambahkan `tx.audit_log.create` di dalam loop transaksi retrieve, setelah `stok_ledger.create` dan sebelum `capacityService.recalculateZonaStatus`
- `data_sesudah` berisi: `surat_jalan_id`, `surat_jalan_item_id`, `barang_id`, `zona_id`, `qty`, `kondisi_diminta`, `kondisi_diambil`, `override`, `catatan_kondisi`
- Semua BigInt/Decimal dikonversi ke Number/String sebelum masuk JSON
- Tidak ada fallback kondisi otomatis; override hanya terjadi jika payload `kondisi` berbeda dan `catatan_kondisi` diisi

## Langkah 3 - Tampilkan jejak untuk SPV
- Sudah ada halaman audit log di `frontend/app/dashboard/reports/page.tsx` yang memanggil `/api/reports/audit-log`
- Entri baru akan muncul di sana, tetapi tidak ada filter khusus per surat jalan. Usulan: tambah filter `entity_id` di halaman reports.
