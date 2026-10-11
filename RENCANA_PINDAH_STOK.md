# RENCANA_PINDAH_STOK.md (READ-ONLY)

## Temuan kode (A)

### A.1 stok_ledger di surat-jalan.repository.js (rentang relevan)
Berdasarkan pembacaan baris ~780-940 & ~1090-1130:

- Pengurangan stok (outbound/penarikan):
  - Mencari kandidat stok_gudang untuk gudang_id, barang_id, project_id, kondisi (bila diterapkan) dengan orderBy [{ zona_id: 'asc' }, { stok_id: 'asc' }].
  - Untuk tiap kandidat: updateMany dengan qty: { decrement: qtyAmbil }, updated_at: new Date() dan syarat qty: { gte: qtyAmbil } (guard concurrency). Setelah update, ambil setelah.qty dan jika saldo <= 0 jalankan deleteMany untuk baris tsb (menghapus baris stok_gudang saat habis, bukan membiarkan qty=0).
  - Membuat stok_ledger dengan kolom: surat_jalan_item_id (itemId dari SJ item terkait), barang_id, cluster_id (diambil dari SJ terkait via cache: romSj.cluster_id || null), jenis_mutasi: 'out', qty: qtyAmbil, saldo_setelah: Math.max(0, saldo).
  - Panggil recalculateZonaStatus setelah mutasi per zona.

- Penambahan stok (inbound):
  - Mencari existing stok_gudang generic dengan zona_id: null untuk (gudang_tujuan_id, barang_id, kondisi: item.kondisi || 'baik'). Jika ada -> update qty menjadi existing.qty + qty, update updated_at. Jika tidak -> create stok_gudang baru dengan: gudang_id, barang_id, project_id: null, kondisi, qty, zona_id: null.
  - Membuat stok_ledger dengan kolom: surat_jalan_item_id: item.item_id, barang_id, cluster_id: item.cluster_id || null, jenis_mutasi: 'in', qty, saldo_setelah: (qty baru / qty hasil create).
  - Tidak ada upsert berbasis unique key global; logika 'cari existing lalu update/create'.

Catatan kunci:
- Tidak menggunakan upsert berbasis @@unique; menggunakan findFirst lalu update/create.
- Baris stok_gudang dihapus (deleteMany) saat saldo <= 0.
- cluster_id diisi dari SJ/item terkait (bisa NULL).
- surat_jalan_item_id diisi untuk mutasi terkait SJ item.
- saldo_setelah dihitung per baris stok_gudang (bukan agregat per barang per gudang).

### A.2 Schema (Prisma) stok_gudang & stok_ledger
- stok_gudang: stok_id(PK), gudang_id, zona_id(nullable), barang_id, project_id(nullable), kondisi(enum), qty(decimal), updated_at. Unique([gudang_id,zona_id,barang_id,project_id,kondisi]). Indexes on (gudang_id,barang_id),(project_id),(zona_id).
- stok_ledger: ledger_id(PK), surat_jalan_item_id(nullable), return_transaction_id(nullable), barang_id, cluster_id(nullable text), jenis_mutasi(enum in/out), qty, saldo_setelah, waktu_mutasi. Indexes sesuai schema.

### A.3 Trigger/Constraint DB
Diperiksa migration init: tidak ditemukan TRIGGER atau CHECK tambahan selain PK/FK/UNIQUE.

## Data aktual (B) - perlu konfirmasi via DB (read-only)
Karena koneksi DB memerlukan interaksi password, berikut struktur query agregat yang disarankan (hanya SELECT).

| Item | Query agregat | Status |
|---|---|---|
| B.1 Gudang Old Trafford + semua gudang | SELECT gudang_id,nama_gudang,tipe,is_aktif,is_internal,project_id FROM gudang WHERE LOWER(nama_gudang) LIKE '%old%trafford%' OR LOWER(nama_gudang) LIKE '%trafford%'; SELECT gudang_id,nama_gudang,tipe,is_aktif,is_internal,project_id FROM gudang ORDER BY gudang_id LIMIT 30; | PERLU DB |
| B.2 Stok Old Trafford | SELECT COUNT(*) total_baris, COUNT(*) FILTER (WHERE qty>0) baris_qty_gt0, COUNT(DISTINCT barang_id) barang_unik, SUM(qty) total_qty FROM stok_gudang sg JOIN gudang g ON g.gudang_id=sg.gudang_id WHERE LOWER(g.nama_gudang) LIKE '%old%trafford%'; | PERLU DB |
| B.3 Gudang tujuan potensial (aktif, bukan OT) | SELECT g.gudang_id,g.nama_gudang,g.tipe,g.project_id,(SELECT COUNT(*) FROM zona_gudang z WHERE z.gudang_id=g.gudang_id) jml_zona,(SELECT COALESCE(SUM(qty),0) FROM stok_gudang s WHERE s.gudang_id=g.gudang_id) total_stok FROM gudang g WHERE g.is_aktif=true AND NOT (LOWER(g.nama_gudang) LIKE '%old%trafford%') ORDER BY g.gudang_id; | PERLU DB |
| B.4 Zona OT | SELECT z.zona_id,z.kode_zona,z.kapasitas_maksimum FROM zona_gudang z JOIN gudang g ON g.gudang_id=z.gudang_id WHERE LOWER(g.nama_gudang) LIKE '%old%trafford%' ORDER BY z.kode_zona; | PERLU DB |
| B.5 Dokumen menggantung (jumlah) | Hitung per tabel: surat_jalan (asal/tujuan merujuk OT, status belum selesai), surat_jalan_transit (gudang_id OT), boq_item.gudang_tujuan_id OT, user_gudang.gudang_id OT, personil.gudang_id OT, kendaraan.gudang_id OT | PERLU DB |

## Frontend & scope (C)
- FE master-data gudang: rontend/app/dashboard/warehouse/page.tsx berisi manajemen zona (create/edit/delete). Lokasi tombol hapus gudang (soft-delete gudang) kemungkinan di list gudang; perlu cek file lain. [PERLU CEK]
- Pesan error FE: menampilkan json?.message || ...; untuk soft-delete gudang, backend mengembalikan "Gudang tidak dapat dinonaktifkan karena masih memiliki stok." jika ada stok aktif.
- Middleware gudang-scope (gudang-scope.middleware.js): admin/supervisor dibatasi=false. Staf_gudang: jika punya penugasan (user_gudang/personil.gudang_id) -> dibatasi=true dengan gudangIds tsb; jika tidak -> dibatasi=false,sudahDitugaskan=false. Setelah nonaktifkan gudang (is_aktif=false), mapping penugasan tetap ada; dampak akses tergantung pada filter is_aktif di endpoint. Tidak ditemukan hardcode default gudang "Old Trafford".

## Opsi & rekomendasi (D)

### Opsi 1: Skrip sekali jalan (Prisma ) meniru pola SJ
Kelebihan: cepat, terkontrol, bisa menulis stok_ledger konsisten (out lalu in). Kekurangan: bypass alur SJ resmi (nomor SJ, approval). 

Rincian:
- Dry-run + execute (--execute), idempoten (hanya eksekusi jika OT masih punya qty>0).
- Out: kurangi stok OT per baris (update/delete saat <=0). Ledger 'out': surat_jalan_item_id=NULL, barang_id, cluster_id=NULL, jenis_mutasi='out', qty, saldo_setelah = saldo baris OT setelah perubahan.
- Mapping zona: berdasarkan kode_zona (A/B/C/D). Jika kode_zona target tidak ada di gudang tujuan -> laporkan & manual review (jangan buat zona otomatis).
- Bentrok unique key: gabung (jumlahkan) ke baris existing tujuan (update qty += qty_pindah), else create.
- In: ledger 'in' dengan pola serupa, saldo_setelah = saldo baris tujuan setelah penambahan.
- Jalankan dalam 1 transaction.

### Opsi 2: Lewat alur SJ resmi (buat SJ antar gudang)
Kelebihan: mengikuti alur bisnis (approval, nomor SJ, audit trail lengkap). Kekurangan: kompleks untuk migrasi massal (banyak SJ items), butuh approval sesuai role.

Rekomendasi: **Opsi 1** untuk one-off migrasi massal ini, dengan dokumentasi jelas dan dry-run ketat. Ledger menggunakan surat_jalan_item_id=NULL dan cluster_id=NULL untuk menandai transfer non-SJ.

## Rencana eksekusi
1. **Backup**: pg_dump -U postgres -h localhost -d digitak_warehouse > backup_pindah_ot_YYYYMMDD_HHMMSS.dump (simpan path)
2. **Dry-run**: hitung delta per (barang,zona_target,project_id,kondisi) per gudang tujuan; identifikasi bentrok & zona tanpa mapping
3. **Verifikasi pre**: OT qty>0>0, gudang tujuan aktif
4. **Eksekusi** (--execute) dalam 1 transaction (out OT + upsert in tujuan + ledger)
5. **Verifikasi post**: SUM(qty) OT qty>0 == 0; total qty sebelum==sesudah per barang; tidak ada duplikasi kombinasi unik
6. **Nonaktifkan**: setelah lolos verifikasi, panggil DELETE /api/warehouses/:nama_gudang (soft delete) — akan ditolak jika masih ada stok qty>0. Bisa juga UPDATE is_aktif=false via endpoint resmi.

## Pertanyaan terbuka
- Gudang tujuan mana yang dipilih?
- Apakah semua kode_zona OT tersedia di gudang tujuan?
- project_id/kondisi perlu dipertahankan (saat ini dipertahankan sesuai unique key)?
- Perlu membuat SJ virtual untuk traceability? (opsional)

## Bagian yang belum diperiksa
- Data aktual DB (semua B) — butuh koneksi psql
- Lokasi pasti tombol hapus gudang di FE master-data gudang list
- Default warehouse config di FE
- Detail gudang-scope.resolveGudangIds
- Trigger/constraint di migration lain
