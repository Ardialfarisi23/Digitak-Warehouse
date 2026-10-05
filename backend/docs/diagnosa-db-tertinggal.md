# Diagnosa Database Tertinggal

## Hasil migrate status
- 56 migrations ditemukan di `prisma/migrations`
- 4 migrations **belum diterapkan**:
  - `20261002054800_add_input_rekonsiliasi_to_audit_aksi`
  - `20261002091500_add_surat_jalan_free_text_kendaraan_driver` ← migrasi yang menambah `kendaraan_nama_teks`
  - `20261003113000_add_surat_jalan_item_unit`
  - `20261003150000_add_user_gudang`
- Tidak ada yang failed atau modified.

## Kasus: C (STOP)
**Bukti:**
- Migration `20261002091500_add_surat_jalan_free_text_kendaraan_driver` ada di folder dan termasuk yang belum diterapkan.
- Namun `prisma migrate diff --from-url ... --to-schema-datamodel ...` menghasilkan perintah **DROP dan ALTER berbahaya** di samping ADD:
  - `DROP COLUMN` pada `reconciliation_upload_detail` (`catatan`, `kode_barang`, `kondisi`, `nama_barang`, `pic_mitra`, `project_nama`, `tanggal_laporan`)
  - `DROP INDEX` pada `cluster_pic_id_idx`
  - `ALTER TABLE "boq" ALTER COLUMN "cluster_id" DROP NOT NULL`
  - `DROP CONSTRAINT` dan `DROP FOREIGN KEY` pada `boq_cluster_id_fkey`
  - `DROP TABLE` untuk `user_gudang` dan `surat_jalan_item_unit`
- Ini berarti database memiliki kolom/tabel/index yang **tidak ada di schema** (hasil migrasi sebelumnya yang kemudian di-revert di schema tanpa rollback DB).

## Ringkasan diff (kolom/tabel yang kurang / berbahaya)
**Akan DITAMBAH (aman):**
- Enum `audit_aksi` value `input_rekonsiliasi`
- Kolom `surat_jalan`: `driver_nama_teks`, `kendaraan_nama_teks`, `kendaraan_no_polisi_teks`
- Tabel `user_gudang`, `surat_jalan_item_unit` beserta index dan FK-nya

**Berbahaya (DROP/ALTER):**
- 7 kolom di `reconciliation_upload_detail` akan di-`DROP`
- Index `cluster_pic_id_idx` akan di-`DROP`
- `boq.cluster_id` akan di-`ALTER ... DROP NOT NULL`
- 2 foreign key pada `boq` dan `user_gudang` akan di-`DROP` lalu di-`ADD` ulang dengan constraint berbeda

## Rekomendasi langkah aman berikutnya
1. Jangan jalankan `prisma migrate deploy` atau `prisma migrate dev` sebelum menyelaraskan schema dengan database.
2. Periksa apakah kolom `reconciliation_upload_detail.*` memang sengaja dihapus dari schema. Jika ya, buat migration baru untukDROP kolom tersebut di database sebelum migrate deploy.
3. Periksa apakah `boq.cluster_id` memang harus nullable dengan `ON DELETE SET NULL`. Sesuaikan schema atau migrasi sebelumnya.
4. Setelah schema dan database sejalan, jalankan `prisma migrate deploy` untuk menerapkan 4 migration tertinggal.
