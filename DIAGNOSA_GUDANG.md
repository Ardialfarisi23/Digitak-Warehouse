# DIAGNOSA GUDANG (READ-ONLY) 

## 1. Stack ringkas
- Bahasa: JavaScript/TypeScript (Fullstack)
- Backend: Express.js (Node.js), Prisma ORM v5
- Database: PostgreSQL
- Frontend: Next.js (App Router), React + TypeScript
- Migrasi: Prisma Migrations (backend/prisma/migrations/)
- Migration init: backend/prisma/migrations/20260814182706_init/migration.sql

## 2. Skema gudang & stok (nama tabel/kolom/relasi)
**Tabel gudang (warehouse):**
- Tabel: public.gudang (Prisma model: gudang)
- Primary key: gudang_id (BIGSERIAL)
- Kolom kunci: nama_gudang, tipe (enum gudang_tipe: 'tetap'|'dadakan'), alamat, project_id, latitude, longitude, keterangan, kapasitas_maksimum, status_kecukupan_gudang, is_aktif (default true), is_internal (default true), created_at/updated_at, created_by, updated_by, pic_id
- Relasi (kunci): creator/updater/pic -> user_account/personil, project -> project, personil_gudang/kendaraans/user_gudangs -> many-to-one, zonas -> zona_gudang, surat_jalan_asal/surat_jalan_tujuan -> surat_jalan (FK), transit_checkpoints -> surat_jalan_transit, boq_items -> boq_item

**Tabel zona gudang:**
- Tabel: zona_gudang
- FK: gudang_id -> gudang(gudang_id) ON DELETE CASCADE
- Kolom: kode_zona, nama_zona, tipe_zona, kapasitas_maksimum, status_kecukupan, dinilai_oleh/pada, unique(gudang_id, kode_zona)

**Stok (penyimpanan qty per gudang):**
- Tabel: stok_gudang (Prisma model stok_gudang) — stok per (gudang, zona, barang, project, kondisi)
- PK: stok_id
- FK: gudang_id -> gudang(gudang_id) (RESTRICT on delete via schema; FK definition), barang_id -> barang(barang_id), zona_id -> zona_gudang(zona_id) (nullable), project_id -> project(project_id) (nullable)
- Kolom: qty (decimal 14,2, default 0), kondisi (enum kondisi_barang, default 'baik'), updated_at
- Unique: (gudang_id, zona_id, barang_id, project_id, kondisi)

**Ledger mutasi stok (riwayat):**
- Tabel: stok_ledger (Prisma model stok_ledger) — mencatat tiap mutasi
- PK: ledger_id
- Kolom: surat_jalan_item_id (nullable), return_transaction_id (nullable), barang_id, cluster_id, jenis_mutasi (enum mutasi_jenis: 'in'|'out'), qty (decimal 14,2), saldo_setelah (decimal 14,2), waktu_mutasi (default now())
- FK: surat_jalan_item_id -> surat_jalan_item(item_id) (RESTRICT), return_transaction_id -> return_transaction(return_id) (SET NULL)

## 3. Cara stok disimpan
- Stok disimpan per gudang (dan per zona, per barang, per project, per kondisi) di tabel **stok_gudang** (baris unik per kombinasi). Bukan angka di tabel produk/barang saja.
- Setiap perubahan stok dicatat di **stok_ledger** (audit trail) dengan jenis_mutasi in/out, qty, saldo_setelah, waktu_mutasi, dan link ke surat_jalan_item (bila berasal dari Surat Jalan).

## 4. Daftar referensi ke gudang + aksi on-delete
Berdasarkan migration init (FK):
- personil.gudang_id -> gudang(gudang_id) ON DELETE SET NULL
- gudang.pic_id -> personil(personil_id) ON DELETE SET NULL
- gudang.project_id -> project(project_id) (no explicit ON DELETE shown; default RESTRICT/CASCADE depends; schema relations: project? @relation fields: [project_id], references: [project_id])
- gudang.created_by/updated_by -> user_account(user_id) ON DELETE RESTRICT (umum)
- zona_gudang.gudang_id -> gudang(gudang_id) ON DELETE CASCADE
- kendaraan.gudang_id -> gudang(gudang_id) (relation stated; FK not fully shown in snippet but relation exists)
- stok_gudang.gudang_id -> gudang(gudang_id) (FK via schema; implisit RESTRICT)
- surat_jalan.gudang_asal_id -> gudang(gudang_id) ON DELETE SET NULL (migration shows: "surat_jalan_gudang_asal_id_fkey" ... ON DELETE SET NULL)
- surat_jalan.gudang_tujuan_id -> gudang(gudang_id) ON DELETE SET NULL
- surat_jalan_transit.gudang_id -> gudang(gudang_id) (relation; transit checkpoints ke gudang transit)
- boq_item.gudang_tujuan_id -> gudang(gudang_id) ON DELETE SET NULL
- user_gudang.gudang_id -> gudang(gudang_id) ON DELETE CASCADE
- personil_gudang relation via personil.gudang_id SET NULL

Catatan: Di schema.prisma, relasi stok_gudang.gudang -> gudang tanpa onDelete eksplisit; praktik kode saat soft-delete gudang memeriksa stok aktif (lihat poin 6) — jadi aplikasi mencegah hapus saat ada stok.

## 5. Alur transfer stok antar gudang
**Transfer/mutasi antar gudang di sistem ini:** 
- Tidak ada modul "transfer stok" terpisah (tidak ditemukan controller/service/repo transfer-mutasi khusus). Perpindahan stok antar gudang direalisasikan melalui alur **Surat Jalan (SJ)**.
- SJ tipe: inbound/outbound (enum surat_jalan_tipe). Field: gudang_asal_id, gudang_tujuan_id, tujuan_tipe (enum tujuan_tipe_enum: 'lapangan'|'gudang'), dll.
- Saat SJ outbound disetujui/diproses untuk perpindahan antar gudang/internal, sistem mengurangi stok di gudang asal (via surat-jalan.repository/service saat delivery/putaway logic) dan menambah stok di gudang tujuan saat inbound/diterima (tergantung alur). Lihat logika mutasi:
  - surat-jalan.repository.js:808, 1110 — create stok_ledger dengan jenis_mutasi "out" (saat pengambilan/pengeluaran)
  - surat-jalan.repository.js:905, 927 — create stok_ledger dengan jenis_mutasi "in" (saat penerimaan/penambahan ke tujuan)
- Ledger: stok_ledger merekam surat_jalan_item_id; transaksi menggunakan DB transaction (Prisma ) saat update stok + create ledger (terlihat di repository code paths).
- Transit: ada mekanisme transit (surat_jalan_transit, gudang transit bertipe dadakan) — checkpoint perjalanan.

## 6. Logika hapus gudang saat ini
- Endpoint: DELETE /api/warehouses/:nama_gudang (routes.js:33)
- Controller: warehouse.controller.softDelete (menerima req.params.nama_gudang, panggil service.softDelete)
- Service: warehouse.service.softDelete(gudang_id)
  - Validasi: gudang ditemukan? jika tidak -> AppError 404
  - Validasi stok aktif: hasActiveStock(gudang_id) memeriksa prisma.stok_gudang.findFirst({ where: { gudang_id, qty: { gt: 0 } }, select: { stok_id: true } }) -> jika ada stok aktif -> AppError 400 "Gudang tidak dapat dinonaktifkan karena masih memiliki stok."
  - Jika lolos validasi -> warehouseRepository.softDelete(gudang_id) yang melakukan UPDATE gudang SET is_aktif = false (soft delete)
- Repository: softDelete/update restore menggunakan update dengan is_aktif true/false
- Hak akses: hanya role "ADMIN" (authorize("ADMIN"))
- Soft delete (bukan hard delete). Tidak ada DELETE CASCADE fisik ke stok_gudang/surat_jalan saat softDelete; aplikasi mencegah soft-delete bila masih ada qty>0.

Path file relevan:
- backend/src/modules/warehouse/warehouse.routes.js:33
- backend/src/modules/warehouse/warehouse.controller.js:42
- backend/src/modules/warehouse/warehouse.service.js:342-355 (softDelete), 334-340 (hasActiveStock)
- backend/src/modules/warehouse/warehouse.repository.js:150-160 (softDelete/restore)

## 7. Temuan "Old Trafford"
- Ditemukan di berbagai tempat (bukan hanya seed/kode):
  - .kilocode/TASK_NOTES.md:171 — "Gudang Old Trafford: 153 rows (4 zones × 38/39)"
  - backend/prisma/backups/*.sql (dump cadangan lama): menyebut "Gudang Old Trafford" dengan data gudang (mis. id 7, alamat Manchester M16 0RA, lat/lon, created_by/updater, status_aktif t, dll.)
- Tidak ditemukan string "Old Trafford" di migration init (20260814182706_init/migration.sql). Tidak ditemukan di kode backend/src (service/repo/controller/routes/validation) — hanya muncul di backup dump dan TASK_NOTES.md (catatan task). 
- Artinya "Old Trafford" kemungkinan data operasional (ada di DB live/backup), bukan hardcoded di kode saat ini. Perlu dicek data seed/migration lain atau data DB; dari yang dibaca (read-only), belum terlihat seed kode yang menetapkan nama ini secara eksplisit.

Gudang lain (berdasarkan dump backup terlihat): ada gudang-gudang lain terdaftar di backup; namun untuk daftar lengkap gudang lain dari kode/seed saat ini belum teridentifikasi eksplisit di file src yang dibaca. TASK_NOTES.md menyebut "Gudang Rancamanyar", "Gudang Ciamis", "Gudang Old Trafford" sebagai 3 gudang aktif (dari konteks seed stok MOS).


## 8. Risiko & hal yang belum jelas
Risiko jika menghapus gudang (soft/hard):
- stok_gudang dengan qty>0 -> aplikasi saat ini mencegah soft-delete (validasi hasActiveStock). Jadi sebelum "menghapus" gudang Old Trafford, wajib kosongkan/pindahkan stok (transfer via SJ) ke gudang lain.
- surat_jalan dengan gudang_asal_id/gudang_tujuan_id merujuk gudang -> FK pakai ON DELETE SET NULL (bisa jadi data historis kehilangan konteks gudang).
- boq_item.gudang_tujuan_id -> SET NULL (bisa merusak referensi rencana distribusi).
- transit_checkpoints, zona_gudang (CASCADE) — menghapus gudang (soft delete tidak menghapus baris, hard delete akan menghapus zona; tapi saat ini soft delete).
- user_gudang (mapping user ke gudang) -> ON DELETE CASCADE jika hard delete, tapi soft delete tidak berdampak.
- personil.gudang_id -> SET NULL; kendaraan.gudang_id -> relation (kemungkinan SET NULL).
- Laporan/historical data (stok_ledger, surat_jalan_item_foto dll) tetap ada; referensi ke gudang bisa null.
- Dropdown default gudang, setting default warehouse, scope middleware (gudang-scope.middleware) — perlu dicek apakah ada default hardcoded "Old Trafford".
- Unik nama_gudang (findByNama di repo) — bisa bentrok jika restore/rename.

Hal belum jelas:
- Apakah ada test yang secara spesifik menguji hapus gudang? (hanya ditemukan test middleware gudang-scope.middleware.test.js)
- Apakah sistem punya fitur "transfer mutasi" terpisah (UI/endpoint) selain lewat SJ? Belum ditemukan modul terpisah.
- Apakah gudang Old Trafford memiliki stok aktif saat ini? Perlu query DB (read-only tidak dijalankan).
- Default warehouse setting (konfigurasi) — belum ditemukan di src.

## 9. Apakah ada test yang menyentuh gudang/stok?
Ditemukan: backend/src/middlewares/gudang-scope.middleware.test.js (menyentuh gudang scope). Belum ditemukan test khusus warehouse CRUD (create/update/delete) atau stok/transfer di file test yang dibaca dalam scope ini. Bisa ada test lain di lokasi berbeda.

## 10. Bagian yang belum sempat diperiksa
- FE routes/pages terkait master-data gudang (frontend/app/dashboard/master-data/*) untuk melihat UI hapus gudang & validasi.
- Middleware gudang-scope.middleware.js (logika scope per gudang) — dampak soft delete.
- Capacity/service terkait zona kapasitas, picking, dll.
- API spec/openapi atau docs lain.
- Seed files jika ada (backend/prisma/seed* atau seed skrip) — tidak terlihat di src yang dibaca; hanya backup dumps.
- Data aktual DB (qty stok Old Trafford) — butuh query read-only.
