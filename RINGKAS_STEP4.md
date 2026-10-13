# RINGKAS_STEP4.md

## 1a. recalculateZonaStatus (capacity.service.js)
Signature:
async function recalculateZonaStatus(tx, gudangId, zonaId, actorId = null)
Catatan: tx wajib, actorId optional (null), zonaId null di-skip.

## L1. Backup
- pg_dump: tidak ditemukan di PATH/C:\Program Files\PostgreSQL\*
- JSON backup (read-only): pre_pindah_ot_* dibuat via Prisma (g7,g1,zg7,zg1,sg7,sg1,p7), BigInt/Decimal sebagai string

## L2. Pemeriksaan kode
- Ledger: laporan.repository.js/stock-check.service.js mengakses stok_ledger. Dampak: pasangan out/in tanpa SJ tercatat tanpa referensi surat_jalan_item_id/return_transaction_id
- softDelete: menerima gudang_id (findById), controller meneruskan nama_gudang -> mismatch (sebaiknya findByNama). Route pakai :nama_gudang
- findAll: memfilter is_aktif=true

## L3. Skrip
- backend/scripts/pindah-stok-ot.js: dry-run default, --execute, --write-ledger. Pemetaan zona via kode_zona, findFirst untuk tujuan (project_id IS NOT DISTINCT FROM), hapus baris OT saat dipindah, update personil.gudang_id, recalculateZonaStatus untuk zona A-D (target+source) dengan actorId null. Pre-flight lengkap.

## L4. Dry-run
- CSV: backend/prisma/backups/dryrun_ot_{timestamp}.csv (152 baris)
- Ringkasan: UPDATE 152, CREATE 0, total qty OT 36056.00, tujuan sebelum (g1)=36056.00, sesudah=72112.00, 1 baris qty 0 tidak disentuh, personil dipindah: 1 (gudang_id=7)
- Audit: backend/prisma/backups/audit_pindah_ot_{timestamp}.json (dryRun true)

## Yang belum selesai
- pg_dump tidak tersedia di lingkungan ini
- Lokasi pasti tombol hapus gudang di FE master-data list & default warehouse config di FE belum dibaca detail
