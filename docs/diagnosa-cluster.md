# Diagnosa Cluster & Barang — Digitak Warehouse

> Generated: 2026-10-06 | Analyst: Kilo (automated)
> Scope: Backend (Express + Prisma + PostgreSQL) + Frontend (Next.js 16 + shadcn/ui)
> Catatan: Halaman di bawah ini menandai progress dengan `LANJUT DARI: <titik>` untuk mematuhi hemat token.

---

## 1. Ringkasan Stack

| Layer | Teknologi | Catatan |
|-------|-----------|---------|
| **Backend** | Node.js, Express 5, Prisma 6, PostgreSQL, Zod, ExcelJS | Port default 5000 |
| **Frontend** | Next.js 16.3 (webpack), React 19, Tailwind 4, shadcn/ui, React Hook Form, TanStack Query, SWR | Port default 3000 |
| **ORM/DB** | Prisma Client + migration-based schema | `backend/prisma/schema.prisma` (1002 baris) |
| **State/fetch** | SWR (master data), TanStack Query (recon/boq), axios | |

**Konvensi penamaan field DB (Prisma → API → Frontend):**
- snake_case di Prisma (`cluster_id`, `nama_cluster`, `alamat_lengkap`)
- camelCase di JS (`clusterId`, `namaCluster`) terjadi hanya di layer fetch spesifik, BUKAN di master-data page
- Master data page menggunakan key Prisma langsung sebagai column key (lihat `columns` array di `frontend/app/master-data/page.tsx:1967`)

**Konvensi tipe data untuk field numerik:**
- `Int?` untuk integer kecil (contoh: `kapasitas_maksimum Int?` di model `gudang`, `schema.prisma:231`)
- `Decimal? @db.Decimal(14,2)` untuk jumlah/kuantitas (contoh: `qty_rencana`, `mos`, `used`)
- Tidak ada field numerik di model `cluster` saat ini

---

## 2. Peta File Relevan

### A. Skema DB / Migration

| Path | Peran |
|------|-------|
| `backend/prisma/schema.prisma:144-173` | Model `project` — `project_id` (BigInt PK), `nama_project`, `area`, `alamat` **TIDAK ADA** (hanya `kecamatan`, `desa_kelurahan`, `kota_kabupaten`, `provinsi`), `cluster_id` String? (foreign key ke `cluster.cluster_id`), relasi `clusters cluster[]` |
| `backend/prisma/schema.prisma:175-199` | Model `cluster` — `cluster_id` Text PK, `project_id` BigInt FK, `nama_cluster`, `cluster_type`, `alamat_lengkap` Text? (sudah ada sejak migrasi `20260928230000`), `pic_id`, `status_aktif` |
| `backend/prisma/schema.prisma:352-401` | Model `boq` — `cluster_id` Text? nullable, relasi ke `cluster`, index `boq_cluster_id_idx` |
| `backend/prisma/schema.prisma:352-371` | Model `tiket_material` — `cluster_id` Text? nullable, **TIDAK ADA** relasi FK eksplisit (hanya `project_id` FK) |
| `backend/prisma/schema.prisma:403-421` | Model `boq_item` — **TIDAK ADA** `cluster_id` (cluster diambil lewat `boq.cluster_id`) |
| `backend/prisma/schema.prisma:323-350` | Model `barang` — **TIDAK ADA** `cluster_id` |
| `backend/prisma/schema.prisma:423-443` | Model `permintaan_boq` — **TIDAK ADA** `cluster_id` |
| `backend/prisma/migrations/20260927051445_add_cluster_table_and_transitional_columns/migration.sql` | Migrasi pembuatan tabel `cluster` dan penambahan `cluster_id` ke `boq` + `tiket_material` |
| `backend/prisma/migrations/20260927220000_make_boq_cluster_id_not_null/migration.sql` | Migrasi membuat `boq.cluster_id` NOT NULL (pre-check: 0 row NULL) |
| `backend/prisma/migrations/20260928230000_add_alamat_lengkap_to_cluster/migration.sql` | Migrasi menambah `alamat_lengkap TEXT` ke `cluster` |
| `backend/prisma/migrations/20261001000001_add_cluster_pic_id/migration.sql` | Migrasi menambah `pic_id` + index + FK ke `personil` |

### B. Backend: API / Service / Route / Controller / Repository

| Path | Peran |
|------|-------|
| `backend/src/modules/cluster/cluster.routes.js` | Routes: `GET /`, `GET /all`, `POST /`, `PUT /:clusterId`, `PATCH /:clusterId/toggle-status`, `DELETE /:clusterId` |
| `backend/src/modules/cluster/cluster.controller.js` | Controller: `listByProject` (butuh `?project_id=`), `listAll`, `create`, `update`, `toggleStatus`, `deleteCluster` |
| `backend/src/modules/cluster/cluster.service.js` | Business logic: validasi create/update, cek duplikat cluster_id, warning jika nonaktifkan cluster dengan BOQ aktif |
| `backend/src/modules/cluster/cluster.repository.js` | Data access: `findByProjectId` (tanpa include project), `findAll` (dengan include `project: {project_id, nama_project, area}` dan `pic`), `create`, `update`, `toggleStatus` |
| `backend/src/modules/cluster/cluster.validation.js` | Zod schema: `createClusterSchema` (termasuk `alamat_lengkap`, `pic_id`), `updateClusterSchema` (hanya `nama_cluster`, `cluster_type`, `alamat_lengkap`, `pic_id`) |
| `backend/prisma/seeders/cluster.seed.js` | Seeder sinkronisasi cluster dari project lama |
| `backend/prisma/seeders/project.seed.js` | Reference: project lama dengan `cluster_id` ("CL001" - "CL005") |

### C. Frontend: Master Data (Tabel Master Cluster)

| Path | Peran |
|------|-------|
| `frontend/app/master-data/page.tsx:101-159` | Tab definition: `clusters` → `endpoint: "/api/clusters/all"`, `idField: "cluster_id"` |
| `frontend/app/master-data/page.tsx:270-280` | `TAB_FIELDS.clusters` — definisi field form: `project_id`, `nama_cluster`, `cluster_type`, `alamat_lengkap`, `cluster_id`, `status_aktif` |
| `frontend/app/master-data/page.tsx:1966-1967` | Kolom tabel cluster: `["cluster_display", "cluster_id", "cluster_type", "status_aktif"]` |
| `frontend/app/master-data/page.tsx:2003-2007` | Label kolom: `cluster_display: "Nama Cluster"`, `cluster_id: "Cluster ID"`, `cluster_type: "Tipe Cluster"` |
| `frontend/app/master-data/page.tsx:2338-2348` | Render cell `cluster_display`: gabung `project?.nama_project + " + " + nama_cluster` |
| `frontend/app/master-data/page.tsx:649-654` | Build initial form `project_id` (dari `record.project_id` atau `record.project.project_id`), `cluster_id` (dari `record.cluster_id`) |
| `frontend/app/master-data/page.tsx:818-844` | `visibleFormFields` untuk cluster: **`cluster_id` di-hide saat mode edit** (hanya readonly di create) |
| `frontend/app/master-data/page.tsx:965-967` | URL API create: `POST /api/clusters`, update: `PUT /api/clusters/{clusterId}` |
| `frontend/app/master-data/page.tsx:1758-1759` | Toggle-status URL: `PATCH /api/clusters/{clusterId}/toggle-status` |

### D. Frontend: BOQ Page (Modal Tambah Cluster Inline)

| Path | Peran |
|------|-------|
| `frontend/app/dashboard/boq/page.tsx:285-289` | State: `clusters`, `clusterModalOpen`, `clusterForm` (9 field: `cluster_id`, `nama_cluster`, `cluster_type`, `project_type`, `kso_partner`, `kso_contact`, `no_tiket_release`, `vendor`, `alamat_lengkap`) |
| `frontend/app/dashboard/boq/page.tsx:756-790` | `handleCreateCluster`: POST `/api/clusters` dengan 9 field |
| `frontend/app/dashboard/boq/page.tsx:2192-2288` | Form modal cluster: Cluster ID, Nama Cluster, Tipe Cluster, Alamat Lengkap — **TIDAK ada** `project_type`, `kso_partner`, `kso_contact`, `no_tiket_release`, `vendor` |
| `frontend/app/dashboard/boq/page.tsx:1376-1408` | Dropdown pilih cluster di BOQ form, opsi `__new__` untuk buka modal tambah cluster |

### E. Frontend: Supervisor BOQ Page (Modal Tambah Cluster Inline — duplikat)

| Path | Peran |
|------|-------|
| `frontend/app/dashboard/supervisor/boq/page.tsx:246-248` | `clusterForm` state (9 field sama seperti BOQ page) |
| `frontend/app/dashboard/supervisor/boq/page.tsx:1340-1388` | Form modal cluster: Cluster ID, Nama Cluster, Tipe Cluster, Alamat Lengkap — sama seperti BOQ page, **field lain tidak di-render** |

### F. Export & Laporan

| Path | Peran |
|------|-------|
| `frontend/lib/exportReconciliationXlsx.ts:102-108` | Label export: `Cluster ID`, `Cluster`, `PIC`, `No. Tiket`, `Kode BOQ` |
| `frontend/lib/exportReconciliationXlsx.ts:426` | Sheet summary: header `Cluster`, key `nama_cluster` |
| `frontend/lib/audit-labels.ts:61-62` | Label export: `cluster_id: "Cluster"`, `nama_cluster: "Nama Cluster"` |

---

## 3. Temuan Per Task

### A.1 Kolom Project dan Cluster Dipisah

**Kondisi saat ini:**
- Tabel master cluster hanya punya **SATU kolom gabungan** bernama `cluster_display` (`frontend/app/master-data/page.tsx:1967`)
- Tidak ada kolom `Project` terpisah di tabel cluster
- Render cell (`page.tsx:2338-2348`):
  ```tsx
  const projectName = (record as any)?.project?.nama_project || "";
  const clusterName = (record as any)?.nama_cluster || "";
  const display = projectName && clusterName
    ? `${projectName} + ${cluster_name}`
    : clusterName || projectName || "-";
  ```
- Data dari include `project` di `findAll()` (`cluster.repository.js:54-61`): `project_id`, `nama_project`, `area`
- Relasi: `cluster.project_id → project.project_id` (BigInt, FK, `onDelete: Restrict`), dan `project.clusters cluster[]`

**Gap:**
- Project dan Cluster digabung menjadi satu string, **tidak bisa difilter/sort/export secara terpisah**
- Kolom `project_id` (angka) tidak ditampilkan di tabel cluster sama sekali
- `cluster_id` (Text) ditampilkan sebagai kolom terpisah (`page.tsx:1967`)

**Titik perubahan:**
1. Tambah kolom `Project` (label: "Project") di `columns` array (`page.tsx:1967`) — urutan: `["Project", "cluster_display", "cluster_id", "cluster_type", "status_aktif"]` atau pisah jadi `["project_id", "nama_project", "nama_cluster", ...]`
2. Update `getColumnLabel` (`page.tsx:1973-2011`) — tambah `nama_project: "Project"` atau `project_id: "ID Project"`
3. Tambah render cell baru untuk `nama_project` (default fallback cell `formatValue(value)` sudah cukup karena data sudah di-include)
4. Update `exportReconciliationXlsx.ts` dan `audit-labels.ts` jika perlu kolom baru
5. Update search/filter — saat ini search di `findAll()` (`cluster.repository.js:40-49`) hanya mencari `nama_cluster`, `cluster_id`, `cluster_type`, `alamat_lengkap`, `vendor`, `no_tiket_release`, `kso_partner` — **TIDAK** mencari `project.nama_project`

---

### A.2 Tambah Kolom Alamat Lengkap

**Kondisi saat ini:**
- `alamat_lengkap` **SUDAH ADA** di DB: `schema.prisma:185` (`alamat_lengkap String? @db.Text`)
- Sudah ada migrasinya (`20260928230000_add_alamat_lengkap_to_cluster`)
- Sudah ada di `createClusterSchema` (`cluster.validation.js:14`) dan `updateClusterSchema` (`cluster.validation.js:21`)
- Sudah ada di `TAB_FIELDS.clusters` (`master-data/page.tsx:274`) — `{ key: "alamat_lengkap", label: "Alamat Lengkap", type: "textarea" }`
- Sudah ada di `findAll()` include (`cluster.repository.js:15`) — `alamat_lengkap: true`
- Sudah ada di form `visibleFormFields` untuk cluster (`page.tsx:839-841`)
- Sudah ada di BOQ page cluster modal (`boq/page.tsx:2252-2258`) dan supervisor BOQ page (`supervisor/boq/page.tsx:1364-1367`)

**Gap: TIDAK ADA** — field sudah fully implemented di semua layer.

**Catatan tambahan:**
- `alamat_lengkap` **TIDAK ADA** di model `project` (hanya `kecamatan`, `desa_kelurahan`, `kota_kabupaten`, `provinsi`)
- `alamat` ada di model `titik_lapangan` (`schema.prisma:207`) — pola yang berbeda

**Kesimpulan:** Task ini **SUDAH SELESAI**. Tidak perlu perubahan.

---

### A.3 Tambah Field Homepass Plan

**Kondisi saat ini:**
- `homepass_plan` **BELUM ADA** di manapun (tidak ada di Prisma, backend, atau frontend)
- Tidak ada field serupa di model `cluster` (field saat ini: `cluster_id`, `nama_cluster`, `cluster_type`, `project_type`, `kso_partner`, `kso_contact`, `no_tiket_release`, `vendor`, `alamat_lengkap`, `pic_id`, `status_aktif`)

**Rekomendasi tipe data:**
- `Int?` (nullable integer) — sesuai konvensi `kapasitas_maksimum Int?` di model `gudang` (`schema.prisma:231`)
- Alternatif: `Decimal? @db.Decimal(14,2)` — tapi cluster tidak punya field numerik lain, jadi `Int?` lebih konsisten

**Semua titik yang perlu ditambah:**

| Layer | File | Titik perubahan |
|-------|------|-----------------|
| **Migration** | `backend/prisma/migrations/YYYYMMDDHHMMSS_add_homepass_plan_to_cluster/migration.sql` | `ALTER TABLE "cluster" ADD COLUMN "homepass_plan" Integer;` |
| **Prisma schema** | `backend/prisma/schema.prisma:175-199` | Tambah `homepass_plan Int?` setelah `alamat_lengkap` |
| **Validation** | `backend/src/modules/cluster/cluster.validation.js` | `createClusterSchema`: tambah `homepass_plan: z.number().optional().nullable()` |
| | | `updateClusterSchema`: tambah `homepass_plan: z.number().optional().nullable()` |
| **Service** | `backend/src/modules/cluster/cluster.service.js:57-63` | Tambah `homepass_plan: data.homepass_plan` di `updateData` |
| **Repository** | `backend/src/modules/cluster/cluster.repository.js` | `findByProjectId`: tambah `homepass_plan: true` di select; `findAll`: tambah `homepass_plan: true` di include; `create`: tidak perlu (Prisma pass-through); `update`: tidak perlu (Prisma pass-through) |
| **Frontend — TAB_FIELDS** | `frontend/app/master-data/page.tsx:270-280` | Tambah `{ key: "homepass_plan", label: "Homepass Plan", type: "number" }` setelah `alamat_lengkap` |
| **Frontend — columns** | `frontend/app/master-data/page.tsx:1966-1967` | Tambah `"homepass_plan"` di array columns cluster |
| **Frontend — column label** | `frontend/app/master-data/page.tsx:1973-2011` | Tambah `homepass_plan: "Homepass Plan"` |
| **Frontend — BOQ cluster modal** | `frontend/app/dashboard/boq/page.tsx:287` | Tambah `homepass_plan: ""` di `clusterForm` initial state |
| | `frontend/app/dashboard/boq/page.tsx:762-773` | Tambah `homepass_plan: clusterForm.homepass_plan || null` di payload POST |
| | `frontend/app/dashboard/boq/page.tsx:2192-2288` | Tambah field form (number input) di modal cluster |
| **Frontend — Supervisor BOQ** | `frontend/app/dashboard/supervisor/boq/page.tsx` | Sama seperti BOQ page |
| **Seeder** | `backend/prisma/seeders/cluster.seed.js` | Tidak perlu (tidak ada data default homepass_plan) |

---

### A.4 Modal Edit disamakan dengan Form Tambah

**Kondisi saat ini — Form Tambah (Master Data):**
Disediakan oleh `FormModal` (`page.tsx:609-851`), field untuk cluster:
| # | Key | Label | Type | Required | Mode Create | Mode Edit |
|---|-----|-------|------|----------|-------------|-----------|
| 1 | `project_id` | Project | select | ✅ | ✅ ditampilkan, required | ✅ ditampilkan, required |
| 2 | `nama_cluster` | Nama Cluster | text | ✅ | ✅ | ✅ |
| 3 | `cluster_type` | Tipe Cluster | text | ❌ | ✅ | ✅ |
| 4 | `alamat_lengkap` | Alamat Lengkap | textarea | ❌ | ✅ | ✅ |
| 5 | `cluster_id` | Cluster ID | text | ✅ | ✅ **visible**, required | ❌ **HIDDEN** (`visibleFormFields` filter `page.tsx:839-841`) |
| 6 | `status_aktif` | Status | select | ❌ | ✅ default "true" | ✅ |

Sumber: `TAB_FIELDS.clusters` (`page.tsx:270-280`), `visibleFormFields` (`page.tsx:829-844`), `formFields` (`page.tsx:818-827`).

**Kondisi saat ini — Modal Edit (Master Data):**
- Menggunakan **komponen yang sama** (`FormModal`) dengan `mode="edit"`
- Field yang muncul: `project_id`, `nama_cluster`, `cluster_type`, `alamat_lengkap`, `status_aktif`
- `cluster_id` **disembunyikan** (`visibleFormFields` filter)
- Data diambil dari `record` (existing data)
- Submit: `PUT /api/clusters/{clusterId}`

**Kondisi saat ini — Modal Tambah Cluster di BOQ Page:**
| # | Key | Label | Type | Required |
|---|-----|-------|------|----------|
| 1 | `cluster_id` | Cluster ID | text | ✅ |
| 2 | `nama_cluster` | Nama Cluster | text | ✅ |
| 3 | `cluster_type` | Tipe Cluster | text | ❌ |
| 4 | `alamat_lengkap` | Alamat Lengkap | textarea | ❌ |

Sumber: `boq/page.tsx:2206-2286`. Field lain di `clusterForm` state (`project_type`, `kso_partner`, `kso_contact`, `no_tiket_release`, `vendor`) **TIDAK di-render** meskipun dikirim di payload.

**Tabel Perbedaan Form Tambah vs Modal Edit (Master Data):**

| Aspek | Form Tambah | Modal Edit |
|--------|-------------|------------|
| Komponen | `FormModal` (shared) | `FormModal` (shared) |
| `cluster_id` | Visible, required | Hidden (readonly di backend) |
| `project_id` | Required, dropdown | Required, dropdown |
| `nama_cluster` | Required | Required |
| `cluster_type` | Optional | Optional |
| `alamat_lengkap` | Optional | Optional |
| `status_aktif` | Default "true" | Ditampilkan |
| Validasi | `createClusterSchema` (Zod) | `updateClusterSchema` (Zod) — lebih sedikit field |
| Endpoint | `POST /api/clusters` | `PUT /api/clusters/{clusterId}` |
| Inisialisasi | `buildInitialForm()` dengan mode create | `buildInitialForm()` dengan mode edit |

**Kesimpulan:**
- Master Data sudah menggunakan **satu komponen form bersama** (`FormModal`) untuk Tambah dan Edit
- Perbedaan hanya di: (1) `cluster_id` disembunyikan di edit, (2) schema validasi berbeda, (3) endpoint berbeda
- BOQ page memiliki **modal cluster terpisah** yang kurang field (4 field vs 6 field) — ini adalah gap

**Rekomendasi:**
1. **Master Data**: Sudah optimal. Tidak perlu perubahan untuk task ini.
2. **BOQ/Supervisor BOQ**: Pertimbangkan menggunakan `FormModal` yang sama (shared component) daripada modal inline yang duplikat dan kurang field. Namun ini adalah peningkatan terpisah, bukan bagian dari task A.4.

---

### A.5 Cluster ID Terhubung ke Semua Barang

**Peta entitas "barang" dan status relasi `cluster_id`:**

| Entitas | Model | `cluster_id` ada? | Tipe | FK? | Nullable? | Keterangan |
|---------|-------|-------------------|------|-----|-----------|------------|
| Barang master | `barang` | ❌ **TIDAK ADA** | — | — | — | Tidak ada cluster_id |
| BOQ item | `boq_item` | ❌ **TIDAK ADA** | — | — | — | Cluster diambil lewat `boq.cluster_id` |
| Tiket Material | `tiket_material` | ✅ Ada | `String? @db.Text` | ❌ **Tidak ada FK** | ✅ Nullable | `schema.prisma:356` |
| BOQ | `boq` | ✅ Ada | `String? @db.Text` | ✅ `cluster? @relation(fields:[cluster_id], ref:[cluster_id])` | ✅ Nullable (sebelum migrasi 20260927220000 dibuat NOT NULL) | `schema.prisma:376,392` |
| Permintaan BOQ | `permintaan_boq` | ❌ **TIDAK ADA** | — | — | — | Tidak ada cluster_id |
| Stok Gudang | `stok_gudang` | ❌ **TIDAK ADA** | — | — | — | Tidak ada cluster_id |
| Stok Ledger | `stok_ledger` | ❌ **TIDAK ADA** | — | — | — | Tidak ada cluster_id |
| Surat Jalan | `surat_jalan` | ❌ **TIDAK ADA** | — | — | — | Tidak ada cluster_id |
| Surat Jalan Item | `surat_jalan_item` | ❌ **TIDAK ADA** | — | — | — | Tidak ada cluster_id |
| Laporan Mitra | `laporan_mitra` | ❌ **TIDAK ADA** | — | — | — | Tidak ada cluster_id |
| Return Transaction | `return_transaction` | ❌ **TIDAK ADA** | — | — | — | Tidak ada cluster_id |

**Cara barang dibuat/diedit saat ini:**
1. **Barang master** dibuat di Master Data (`/api/items`) — **TIDAK ada** pilihan cluster saat create/edit
2. **BOQ** dibuat di BOQ page — cluster dipilih dari dropdown `cluster_id` (source: `GET /api/clusters?project_id=`)
3. **BOQ Item** dibuat otomatis saat BOQ dibuat — `barang_id` dipilih, `qty_rencana` diisi, cluster diambil dari `boq.cluster_id`
4. **Tiket Material** dibuat otomatis saat BOQ diaktifkan — `cluster_id` diisi dari `boq.cluster_id` (nullable, bisa NULL)
5. **Permintaan BOQ** dibuat di halaman permintaan — **TIDAK ada** pilihan cluster

**Risiko:**
1. **Data lama tanpa cluster_id**:
   - `boq.cluster_id` sudah di-migrasi menjadi NOT NULL (`20260927220000`) dengan pre-check 0 row NULL — aman
   - `tiket_material.cluster_id` masih nullable — bisa ada data lama NULL
   - `project.cluster_id` (FK ke cluster) masih nullable — bisa ada data lama NULL

2. **Backfill kebutuhan**:
   - Jika ingin menghubungkan `barang` ke cluster, perlu migration baru + backfill data (saat ini 0 relasi)
   - `tiket_material.cluster_id` yang NULL perlu diisi jika ingin full traceability

3. **Constraint FK**:
   - `boq.cluster_id`: NOT NULL, FK ke `cluster.cluster_id` dengan `onDelete: Restrict` (implisit dari `cluster` model `onDelete: Restrict` di `project` relation, tapi untuk `boq` tidak ada onDelete yang didefinisikan — default adalah `Restrict` di Prisma)
   - `tiket_material.cluster_id`: Nullable, **TIDAK ada FK eksplisit** — hanya kolom teks
   - `project.cluster_id`: Nullable, FK ke `cluster.cluster_id` — default onDelete

4. **Dampak ke laporan/filter**:
   - Reconciliation page (`dashboard/reconciliation/page.tsx`) sudah grouping by `cluster_id` dan menampilkan `nama_cluster` — siap jika `barang` punya `cluster_id`
   - Export Excel (`exportReconciliationXlsx.ts`) juga sudah by cluster — siap
   - Filter `projectFilter` di reconciliation tidak ada `clusterFilter` — perlu ditambah jika ingin filter per cluster

**Traceability per cluster yang sudah ada:**
- ✅ Stok masuk/keluar melalui `boq_item` → `boq.cluster_id` (jika BOQ ada cluster)
- ✅ Transaksi: `return_transaction` — **TIDAK** ada `cluster_id`
- ✅ Laporan: `laporan_mitra` — **TIDAK** ada `cluster_id`
- ✅ Tiket: `tiket_material` — ada `cluster_id` nullable, bisa NULL

**Tempat lain yang perlu traceability per cluster (jika ditambahkan):**
- `return_transaction` — perlu tambah `cluster_id` jika ingin tracking return per cluster
- `laporan_mitra` — perlu tambah `cluster_id` jika ingin laporan per cluster
- `stok_gudang` — perlu tambah `cluster_id` jika ingin stok per cluster
- `stok_ledger` — perlu tambah `cluster_id` jika ingin ledger per cluster
- `surat_jalan` — perlu tambah `cluster_id` jika ingin SJ per cluster

---

## 4. Risiko & Dependensi Antar Task

| Risiko | Dampak | Task terkait | Mitigasi |
|--------|--------|--------------|----------|
| Backfill `boq.cluster_id` sudah NOT NULL | Aman, tidak ada data NULL | A.5 | Pre-check sudah dilakukan saat migrasi |
| `tiket_material.cluster_id` masih nullable | Data lama bisa NULL | A.5 | Tambah migrasi backfill atau handle NULL di API |
| `barang` belum punya `cluster_id` | Tidak bisa filter barang per cluster | A.5 | Perlu migration baru + backfill |
| `homepass_plan` baru → belum ada di BOQ form | BOQ page tidak bisa input homepass plan | A.3 | Implementasi di A.3 |
| Kolom `Project` di tabel cluster belum ada | User tidak bisa sort/filter project terpisah | A.1 | Perlu update frontend |
| `alamat_lengkap` belum ada di project model | Alamat hanya ada di cluster, tidak di project | A.2 (sudah selesai) | Tidak ada risiko |
| Modal Edit dan Form Tambah di Master Data sudah shared | Aman, tidak ada duplikasi | A.4 | Tidak ada risiko |
| BOQ page cluster modal kurang field | Data cluster kurang lengkap jika dibuat dari BOQ | A.4 | Gunakan shared component |

**Dependensi:**
- A.1 (pisah Project/Cluster) **tidak bergantung** pada task lain
- A.2 (alamat lengkap) **sudah selesai**, tidak ada dependensi
- A.3 (homepass plan) **tidak bergantung** pada task lain, tapi perlu ditambahkan di form BOQ juga
- A.4 (samakan modal edit dan form tambah) **tidak bergantung** pada task lain
- A.5 (cluster_id ke semua barang) **bergantung** pada migrasi baru dan backfill data

---

## 5. Urutan Pengerjaan yang Disarankan

**Batch 1 — Satu sesi (frontend-only, tidak perlu migrasi DB):**
1. **A.1** — Pisah kolom Project dan Cluster di tabel master cluster
   - Update `columns` array, `getColumnLabel`, render cell `nama_project`
   - Update `findAll()` search untuk include `project.nama_project`
   - Estimasi: 30-45 menit

**Batch 2 — Satu sesi (migrasi DB + backend + frontend):**
2. **A.3** — Tambah field `homepass_plan` (tipe `Int?`)
   - Migration + update Prisma schema + prisma generate
   - Update validation, service, repository
   - Update `TAB_FIELDS`, columns, column label di master data
   - Update BOQ page dan supervisor BOQ page (form + payload)
   - Estimasi: 45-60 menit

**Batch 3 — Satu sesi (frontend-only):**
3. **A.4** — Samakan modal edit dan form tambah
   - Verifikasi perbedaan (sudah done di master data)
   - Opsional: refactor BOQ page cluster modal untuk pakai shared component
   - Estimasi: 20-30 menit (jika refactor BOQ modal) atau 0 menit (jika hanya verifikasi)

**Batch 4 — Satu sesi (analisis + migrasi besar):**
4. **A.5** — Hubungkan cluster_id ke semua barang
   - **Analisis terlebih dahulu**: tabel mana saja yang butuh `cluster_id`
   - Migration untuk `barang`, `permintaan_boq`, `stok_gudang`, dll (jika diperlukan)
   - Backfill data
   - Update API dan frontend
   - **Estimasi: 2-4 sesi** tergantung scope

---

## 6. Pertanyaan / Asumsi yang Perlu Dikonfirmasi

1. **A.1 — Kolom Project**: Apakah kolom `Project` yang dimaksud adalah `nama_project` (string) atau `project_id` (angka)? Atau keduanya?

2. **A.1 — Urutan kolom**: Apakah urutan yang diinginkan adalah `[Project, Nama Cluster, Cluster ID, Tipe Cluster, Status]` atau `[Project, Cluster ID, Nama Cluster, Tipe Cluster, Status]`?

3. **A.2 — Alamat Lengkap**: Apakah `alamat_lengkap` yang sudah ada di cluster sudah cukup, atau perlu ditambahkan juga ke model `project`?

4. **A.3 — Homepass Plan**: Apakah `homepass_plan` adalah jumlah unit/rumah yang direncanakan (integer), atau ada satuan khusus? Apakah ada contoh nilai (misal: 100, 500)?

5. **A.3 — Homepass Plan scope**: Apakah `homepass_plan` hanya perlu di model `cluster`, atau juga di model lain (misal: `boq` untuk target homepass per BOQ)?

6. **A.4 — BOQ cluster modal**: Apakah modal cluster di BOQ page sebaiknya disamakan dengan form master data (menampilkan semua field termasuk `project_type`, `kso_partner`, dll) atau cukup field yang ada sekarang?

7. **A.5 — Scope barang**: Apakah "semua barang" yang dimaksud adalah semua entitas yang ada di tabel di atas, atau hanya `barang` (master barang) dan `boq_item`?

8. **A.5 — FK constraint**: Apakah untuk `tiket_material.cluster_id` perlu ditambahkan FK eksplisit, atau cukup nullable text column seperti sekarang?

9. **A.5 — Backfill data**: Apakah ada data `barang` atau `boq` yang sudah ada dan perlu di-backfill `cluster_id`-nya? Atau semua data baru akan diisi `cluster_id` secara otomatis?

10. **A.5 — Migration strategy**: Apakah migrasi untuk A.5 perlu dilakukan dalam satu migration besar, atau bisa dipecah per entitas (misal: `barang` dulu, lalu `permintaan_boq`, dst)?

---

## Lanjutan

LANJUT DARI: Penulisan file diagnosa-cluster.md — semua section (1-6) sudah diisi.
