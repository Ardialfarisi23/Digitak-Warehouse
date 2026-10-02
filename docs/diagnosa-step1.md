# Diagnosa Step 1: Rekonsiliasi per-Cluster + Filter Project + PIC

## 1. Peta File

| Path | Peran | Baris Penting |
|------|-------|--------------|
| `backend/src/modules/reconciliation/reconciliation.repository.js` | Query/logic inti | L9 `getInventory`, L27 boq_items, L89 shipmentItems, L112 pickRows, L184 inbound/outbound, L215 laporan_mitra, L273 aggregatedMap, L342 rows, L413 filter |
| `backend/src/modules/reconciliation/reconciliation.utils.js` | Pure functions | L20 `computeRemains`, L29 `computeReconciliationStatus`, L50 `aggregateProjectStatus`, L58 `buildPickSummary`, L85 `buildItemPickSummary` |
| `backend/src/modules/reconciliation/reconciliation.service.js` | Service | L4 `refreshTiketMosUsed`, L28 `getInventory` |
| `backend/src/modules/reconciliation/reconciliation.controller.js` | Controller | L4 `getInventory` |
| `backend/src/modules/reconciliation/reconciliation.routes.js` | Route | L10 GET `/inventory` |
| `backend/src/modules/reconciliation/reconciliation.validation.js` | Zod schema | L3 `getReconciliationInventorySchema` (search, projectId, warehouseId, status) |
| `backend/src/modules/reports/reports.controller.js` | Controller upload/confirm | L226 `getHardwareReconciliation`, L235 per-tiket, L244 detailed, L321 upload, L489 confirm, L851 logs |
| `backend/src/modules/reports/reports.routes.js` | Routes reports | L13-24 semua endpoint rekonsiliasi |
| `backend/src/modules/reports/reports.repository.js` | Query reports | L1310 `getHardwareReconciliation` (per-project), L1522 `getHardwareReconciliationPerTiket`, L1687 `getHardwareReconciliationDetailed`, L2009 backfill, L2104 logs |
| `backend/src/modules/dashboard/dashboard.repository.js` | Query dashboard | L150 `getProjectSummary` (aggregate per-project dari recon rows), L209 delegates ke `reconciliationRepository.getInventory` |
| `backend/src/modules/dashboard/dashboard.service.js` | Service dashboard | L182 `getHardwareReconciliation` (duplikasi logika recon repo, per-project), L437 `computeRemains` |
| `backend/src/modules/dashboard/dashboard.controller.js` | Controller | L13 `getProjectSummary`, L35 `getHardwareReconciliation` |
| `backend/src/modules/dashboard/dashboard.routes.js` | Routes | L10 GET `/project-summary`, L12 GET `/reconciliation` |
| `backend/prisma/schema.prisma` | Schema | L126 project, L157 cluster, L330 tiket_material, L351 boq, L381 boq_item, L612 recon_upload_log, L628 recon_upload_detail, L654 laporan_mitra |
| `frontend/app/dashboard/reconciliation/page.tsx` | UI admin | L110 `ReconciliationInventoryPage`, L189 `fetchReconciliation`, L537 projectOptions, L547 `filteredRecords`, L565 export, L644 tabel |
| `frontend/app/dashboard/supervisor/reconciliation/page.tsx` | UI supervisor | L106 `SupervisorReconciliationPage`, L130 `fetchReconciliation` |
| `frontend/app/dashboard/page.tsx` | Dashboard utama | L252 fetch `/api/reconciliation/inventory`, L286 dedupe by project_id |

## 2. Alur Hitung Saat Ini

- **Input**: `boq_item` (join `boq` → `tiket` → `project` + `cluster`), `surat_jalan_item` (join `surat_jalan` → `project`), `surat_jalan_item_pick`, `laporan_mitra` (join `tiket` → `project`), `return_transaction` (via `getLatestPhysicalSnapshot` + `getApprovedReturnsAfterSnapshot`).
- **Agregasi**: Kunci MAP adalah `${projectIdNum}-${barangId}` (L279 repo, L363 dashboard.service). Setiap entry mewakili **satu barang dalam satu project**.
- **Perhitungan per entry**:
  - `boq` = sum `qty_rencana` dari `boq_item`
  - `additional` = sum `qty` inbound `is_kelebihan` 
  - `mos` = sum `qty` outbound (tujuan bukan gudang)
  - `used` = sum `used` dari `laporan_mitra` aktif, fallback ke `outboundByProjectBarang`
  - `remains = mos - (boq + additional)`
  - `status = "sesuai"` jika `remains === 0`, else `"perhatian"`
- **Output**: Array baris per `project+barang`, masing-masing berisi `project_id`, `project_nama`, `cluster_id`, `area`, `barang_id`, `boq`, `additional`, `mos`, `used`, `remains`, `status`, + pick summary + temuan penerimaan.
- **Tingkat agregasi**: Semua hitungan di atas adalah **per-project** (kunci MAP `project+barang`). `dashboard.getProjectSummary` men-sum lagi ke **per-project** (L218-243 dashboard.repository).

## 3. Skema Data & Relasi

- `project` (1) → (N) `cluster` via `cluster.project_id` → `project.project_id`. Kolom penghubung: `cluster.project_id`. Index: `cluster_project_id_idx`. Unique: `(project_id, nama_cluster)`.
- `cluster` (1) → (N) `boq` via `boq.cluster_id` → `cluster.cluster_id`. `boq.cluster_id` NOT NULL.
- `boq` (1) → (N) `boq_item` via `boq_item.boq_id`.
- `tiket_material` → `project` via `tiket_material.project_id`. Kolom `tiket_material.cluster_id` ada tapi nullable (transitional).
- `laporan_mitra` → `project` via `laporan_mitra.project_id`, → `tiket_material` via `laporan_mitra.tiket_id`. Kolom `pic_mitra` (String, bukan FK) menyimpan nama PIC mitra.
- `reconciliation_upload_detail` → `reconciliation_upload_log` via `upload_id`. Kolom `pic_mitra` (String, bukan FK).
- `gudang` punya `pic_id` → `personil.personil_id` (satu-satunya kolom PIC dengan FK di seluruh schema).
- `personil` punya `user_id` → `user_account.user_id` (opsional).
- **TIDAK ADA** kolom `pic_id` / `penanggung_jawab` / `assignee` di tabel `cluster`, `project`, `tiket_material`, atau `boq`.

## 4. Filter yang Ada + Titik Tambah Filter Project

**Backend (sudah ada di API tapi tidak dipakai oleh FE):**
- `reconciliation.repository.getInventory` menerima `search`, `projectId`, `warehouseId`, `status` (L10).
- Filter diterapkan di query: `whereBoq.boq.tiket.project_id` (L23-25), `shipmentWhere.surat_jalan.project_id` (L85-87), `laporanWhere.project_id` (L211-213), plus filter di-memory untuk search (L413-416) dan status (L418-420).
- `reconciliation.validation.js` sudah mendefinisikan schema untuk keempat filter.

**Frontend (filter lokal, TIDAK dikirim ke API):**
- `frontend/app/dashboard/reconciliation/page.tsx`: `projectFilter`, `warehouseFilter`, `statusFilter`, `searchInput` (L119-121).
- `fetchReconciliation` (L189-251) memanggil `get(RECONCILIATION_ENDPOINT)` **tanpa query params**.
- Filtering dilakukan di `filteredRecords` (L547-563) setelah semua data diterima.

**Kesimpulan:** Titik paling tepat menambahkan/memperbaiki filter adalah:
1. **Backend**: sudah siap — tinggal pakai query params yang sudah ada.
2. **Frontend**: ubah `fetchReconciliation` untuk membawa `projectFilter`, `warehouseFilter`, `statusFilter`, `search` sebagai query params ke API, lalu hapus filtering lokal (atau fallback ke lokal jika API gagal).

## 5. Analisis PIC + Opsi + Rekomendasi

**Kenapa PIC tidak muncul:** Tidak ada kolom PIC di tabel `cluster`, `project`, `tiket_material`, atau `boq`. Yang ada hanya `pic_mitra` (nama text) di `laporan_mitra` dan `reconciliation_upload_detail`, yang merupakan **PIC mitra** (internal user). Tidak ada relasi ke `user_account` atau `personil`. `reconciliation.repository.getInventory` tidak melakukan join ke tabel PIC manapun, sehingga daftar rekonsiliasi tidak menampilkan PIC.

**Opsi A: Tambah kolom `pic_id` (BigInt FK → `personil.personil_id`) pada tabel `cluster`**
- Kelebihan: Konsisten dengan pola `gudang.pic_id` yang sudah ada. Satu cluster = satu PIC. Query sederhana (`cluster.pic` include `personil`). Data terpusat di level cluster (unit hitungan baru).
- Kekurangan: Perlu migration + update form CRUD cluster. Existing cluster perlu diisi (bisa NULL untuk sementara).
- Dampak: Migration + modifikasi Prisma schema + update API cluster + update UI cluster. Query recon tinggal tambah `include: { pic: { select: { nama: true } } }`.

**Opsi B: Ambil PIC dari `user_account` yang terakhir mengubah (`updated_by`) pada `cluster` atau `boq`**
- Kelebihan: Tidak perlu migration atau kolom baru. Data sudah ada (`cluster.updated_by`, `cluster.created_by`).
- Kekurangan: Semantik tidak selalu tepat — `updated_by` bisa diisi admin yang mengedit metadata cluster, bukan orang yang "menangani" cluster. Beda BOQ dalam satu cluster bisa punya `updated_by` berbeda.
- Dampak: Hanya perubahan di query + UI. Tidak ada perubahan schema.

**Opsi C: Tabel pivot `cluster_pic` (cluster_id + personil_id, many-to-many)**
- Kelebihan: Fleksibel — satu cluster bisa punya banyak PIC.
- Kekurangan: Over-engineer jika kebutuhan cuma 1 PIC per cluster. Lebih banyak join, lebih kompleks untuk CRUD.
- Dampak: Migration tabel baru + model Prisma baru + CRUD baru + join di query recon.

**Rekomendasi: Opsi A.**  
Alasan: Cluster adalah unit hitungan baru, dan pola `gudang.pic_id` sudah terbukti ada di schema. Satu PIC per cluster cukup untuk kebutuhan operasional. Dampak perubahan terkontrol, dan query bisa langsung include `personil.nama` sebagai nama PIC.

## 6. Daftar File yang Akan Diubah + Risiko

### Perubahan agregasi Project → Cluster

| File | Perubahan | Risiko |
|------|-----------|--------|
| `backend/src/modules/reconciliation/reconciliation.repository.js` | Ganti kunci MAP dari `${projectId}-${barangId}` menjadi `${clusterId}-${barangId}` (L279, L363 dashboard.service). Update include untuk resolve `cluster_id` dari `boq.cluster` atau `tiket.cluster_id`. | **Tinggi**: Fundamental change. Semua consumer (`dashboard`, `reports`, `frontend`) bergantung pada format output. |
| `backend/src/modules/reconciliation/reconciliation.utils.js` | Tambah `aggregateClusterStatus()` serupa `aggregateProjectStatus()` (L50). | Rendah: Fungsi baru, tidak merusak yang lama. |
| `backend/src/modules/dashboard/dashboard.repository.js` | `getProjectSummary` (L150-286) saat ini meng-aggregate per-project. Perlu diubah ke per-cluster atau tetap per-project tapi source dari cluster-level rows. | Sedang: Dashboard menampilkan cards per-project; jika diubah ke cluster-level, UI dashboard juga ikut berubah. |
| `backend/src/modules/dashboard/dashboard.service.js` | `getHardwareReconciliation` (L182-485) adalah duplikasi logika `reconciliation.repository.getInventory`. Perlu diselaraskan atau dihapus jika tidak diperlukan. | Sedang: Duplikasi tech-debt; perubahan bisa mempengaruhi endpoint `/api/dashboard/reconciliation`. |
| `backend/src/modules/reports/reports.repository.js` | `getHardwareReconciliation` (L1310), `getHardwareReconciliationPerTiket` (L1522), `getHardwareReconciliationDetailed` (L1687) — semua agregasi per-project. Perlu diubah ke per-cluster atau tambah opsi grouping. | Tinggi: 3 fungsi besar yang dipakai halaman Reports. |
| `backend/src/modules/reports/reports.controller.js` | Mungkin perlu filter `clusterId` di query params. | Rendah. |
| `backend/src/modules/reconciliation/reconciliation.validation.js` | Tambah `clusterId` ke schema (opsional, jika ingin filter cluster di API). | Rendah. |
| `frontend/app/dashboard/reconciliation/page.tsx` | Ubah tabel: ganti grouping Project → Cluster, tambah kolom PIC, tambah filter cluster. | Sedang: Perubahan UI yang terlihat user. |
| `frontend/app/dashboard/supervisor/reconciliation/page.tsx` | Mirip dengan admin page. | Sedang. |
| `frontend/app/dashboard/page.tsx` | L286-312 dedupe by `project_id`. Perlu disesuaikan jika output berubah ke cluster-level. | Rendah-Sedang. |

### Perubahan tambahan: Tambah kolom PIC per cluster

| File | Perubahan | Risiko |
|------|-----------|--------|
| `backend/prisma/schema.prisma` | Tambah `pic_id BigInt?` + relation ke `personil` di model `cluster` (L157-179). | Tinggi: Perlu migration + seeded existing data. |
| Migration Prisma | Buat migration untuk tambah kolom + FK. | Tinggi: Perlu dijalankan di semua environment. |
| API cluster CRUD | Tambah field `pic_id` di create/update cluster. | Sedang. |
| UI cluster form | Tambah dropdown PIC (personil) di form cluster. | Rendah. |
| `reconciliation.repository.js` | Tambah `include: { pic: { select: { nama: true } } }` pada query cluster. | Rendah. |

### Risiko Keseluruhan

- **Data lama**: Agregasi sebelumnya disimpan di memory per-request (on-the-fly), tidak ada tabel fisik "reconciliation". Jadi tidak ada migrasi data aggregated yang perlu diubah — hanya logika query yang berubah.
- **Laporan/export lain**: `dashboard.getProjectSummary`, `reports.getHardwareReconciliation*`, dan frontend dashboard utama semuanya memakai perhitungan yang sama. Perubahan cluster-level akan mempengaruhi ketiganya.
- **Migrasi DB**: Hanya untuk penambahan kolom `pic_id` di `cluster`. Perubahan agregasi tidak perlu migrasi.
- **Performa**: Perubahan ke cluster-level bisa meningkatkan jumlah row (jika 1 project punya 5 cluster dan 10 barang → 50 rows instead of 10 rows). Perlu test pada dataset besar.

## 7. Pertanyaan Terbuka

1. **Definisi PIC yang diinginkan**: Apakah PIC per cluster adalah orang yang "menangani" cluster di lapangan (bisa diisi saat create cluster), atau PIC diambil dari `user_account` terakhir yang mengedit data cluster, atau dari `personil` yang ditunjuk khusus?
2. **Backward compatibility untuk Reports**: Apakah halaman `/reports/hardware-reconciliation` harus tetap menampilkan per-project (dengan breakdown per-cluster), atau sepenuhnya beralih ke per-cluster?
3. **Cluster tanpa BOQ**: Bagaimana menangani cluster yang belum punya BOQ aktif? Harus tetap muncul dengan status `belum_ada_data`?
4. **Filter project pada daftar cluster-level**: Jika data sudah per-cluster, apakah filter project tetap diperlukan (untuk memfilter cluster mana yang muncul), atau cukup filter cluster saja?
5. **PIC Mitra vs PIC Internal**: Kolom `pic_mitra` di `laporan_mitra` dan `reconciliation_upload_detail` menyimpan nama PIC mitra (partner). Apakah kolom PIC baru di `cluster` adalah untuk internal personil (admin/gudang), atau juga bisa menampung PIC mitra?
