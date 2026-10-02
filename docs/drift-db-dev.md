# Drift DB Dev

**Tanggal:** 2026-09-29  
**Branch:** refactor/outbound-picking-smart-retrieve-and-distribution-flow

---

## Drift dari `prisma migrate diff`

### 1. `stok_ledger`
- **Jenis:** DROP/ADD FK
- **Detail:** `stok_ledger_surat_jalan_item_id_fkey` di-drop dan di-add kembali dengan `ON DELETE SET NULL ON UPDATE CASCADE`.

### 2. `reconciliation_upload_detail`
- **Jenis:** DROP/ADD FK
- **Detail:** `reconciliation_upload_detail_upload_id_fkey` di-drop dan di-add kembali dengan `ON DELETE CASCADE ON UPDATE CASCADE`.

### 3. `boq`
- **Jenis:** ADD FK
- **Detail:** `boq_cluster_id_fkey` ditambahkan dengan `ON DELETE RESTRICT ON UPDATE CASCADE`. Sudah ada di DB, tapi tidak tercatat di migration history Prisma.

### 4. `surat_jalan_item_pick`
- **Jenis:** DROP DEFAULT
- **Detail:** Default value untuk `kondisi_diminta` (`'baik'::kondisi_barang`), `kondisi_diambil` (`'baik'::kondisi_barang`), dan `qty` (`0`) di-drop. Di schema.prisma kolom ini tidak didefinisikan dengan `@default`, tapi di DB ada default dari migration manual.

---

## Migration Tercatat Belum Ter-Apply (objeknya sudah ada di DB)

1. `20260927051445_add_cluster_table_and_transitional_columns` — tabel `cluster` sudah ada.
2. `20260927220000_make_boq_cluster_id_not_null` — kolom `boq.cluster_id` sudah ada.
3. `20260928230000_add_alamat_lengkap_to_cluster` — kolom `cluster.alamat_lengkap` sudah ada.

**Dugaan penyebab:** migration history di Prisma (`_prisma_migrations`) tidak ter-update setelah manual apply atau drift terjadi. Drift ini tidak mempengaruhi kode aplikasi karena objeknya sudah ada di DB.

---

## Catatan

- Tidak ada perubahan yang dilakukan untuk memperbaiki drift ini.
- `20260925000000_add_remains_lapangan` checksum mismatch disebabkan BOM/encoding, bukan SQL. Sudah dilaporkan di step sebelumnya.
