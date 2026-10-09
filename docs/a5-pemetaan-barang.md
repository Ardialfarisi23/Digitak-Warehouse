# A5 — Pemetaan Barang vs Cluster

> Generated: 2026-10-06 | Scope: Prisma schema + COUNT query
> Catatan: Hanya pemetaan. Tidak ada perubahan kode, schema, atau migration.

---

## 1. Tabel Model Barang

| Model | Jenis | Relasi cluster saat ini | Sumber turunan cluster untuk backfill | Jumlah baris | Rekomendasi |
|-------|-------|------------------------|---------------------------------------|--------------|-------------|
| `barang` | Master (definisi barang) | **Tidak ada** `cluster_id` | Tidak ada (master data) | 61 | **Tidak perlu** — barang adalah master yang bisa dipakai lintas cluster |
| `boq_item` | Transaksional (BOQ line item) | **Tidak ada** `cluster_id` | `boq.cluster_id` via `boq_id` (FK) | 64 | **Opsional** — bisa ditambahkan untuk query cepat, tapi sudah bisa ditelusuri via `boq.cluster_id` |
| `permintaan_boq` | Transaksional (permintaan barang) | **Tidak ada** `cluster_id` | `tiket_material.cluster_id` via `tiket_id` (nullable) atau `project_id` → cari cluster terbaru | 2 | **Opsional** — kecil, bisa ditambahkan untuk konsistensi |
| `surat_jalan_item` | Transaksional (pengiriman) | **Tidak ada** `cluster_id` | `surat_jalan.boq_id` → `boq.cluster_id` (nullable, bisa NULL) | 97 | **Opsional** — bisa ditambahkan untuk query cepat |
| `surat_jalan_item_foto` | Transaksional (foto SJ item) | **Tidak ada** `cluster_id` | Tidak ada jalur langsung | 29 | **Tidak perlu** — child dari `surat_jalan_item`, tidak perlu filter cluster |
| `surat_jalan_item_pick` | Transaksional (picking) | **Tidak ada** `cluster_id` | Tidak ada jalur langsung | 15 | **Tidak perlu** — child dari `surat_jalan_item` |
| `stok_gudang` | Transaksional (stok gudang) | **Tidak ada** `cluster_id` (ada `project_id` nullable) | `gudang.project_id` → cari cluster terbaru per project, atau lewat `stok_ledger` → `surat_jalan_item` → `surat_jalan.boq_id` → `boq.cluster_id` | 39 | **Opsional** — kompleks backfill karena bisa lintas cluster |
| `stok_ledger` | Transaksional (mutasi stok) | **Tidak ada** `cluster_id` | `surat_jalan_item` → `surat_jalan.boq_id` → `boq.cluster_id` atau `return_transaction` → `tiket_id` → `tiket_material.cluster_id` | 145 | **Opsional** — bisa ditambahkan untuk audit trail per cluster |
| `reconciliation_upload_detail` | Transaksional (upload rekon) | **Tidak ada** `cluster_id` | Tidak ada jalur langsung | 22 | **Tidak perlu** — data batch, tidak perlu filter cluster |
| `laporan_mitra` | Transaksional (laporan mitra) | **Tidak ada** `cluster_id` | `tiket_id` → `tiket_material.cluster_id` (nullable, 3 NULL) | 23 | **Opsional** — bisa ditambahkan untuk filter laporan per cluster |
| `return_transaction` | Transaksional (retur barang) | **Tidak ada** `cluster_id` | `tiket_id` → `tiket_material.cluster_id` atau `surat_jalan_item_id` → `surat_jalan.boq_id` → `boq.cluster_id` | 5 | **Opsional** — kecil, bisa ditambahkan untuk konsistensi |

---

## 2. Konvensi Relasi Cluster yang Direkomendasikan

### PK/Unique pada model `cluster`
- PK: `cluster_id` — `String @id @db.Text` (TEXT, bukan numerik)
- Unique: `[project_id, nama_cluster]`
- Index: `[project_id]`

### Referensi cluster di model lain (saat ini)
| Tabel | Kolom | Tipe | Nullable | FK eksplisit? | Catatan |
|-------|-------|------|----------|---------------|---------|
| `project` | `cluster_id` | `String?` | ✅ | ❌ Tidak ada | Hanya kolom teks, tidak ada FK |
| `boq` | `cluster_id` | `String? @db.Text` | ✅ | ✅ Ada (`cluster` relation) | FK ke `cluster.cluster_id` |
| `tiket_material` | `cluster_id` | `String? @db.Text` | ✅ | ❌ Tidak ada | Hanya kolom teks, tidak ada FK |

### Rekomendasi konvensi
**Gunakan FK teks (`String @db.Text`) merujuk ke `cluster.cluster_id`**, konsisten dengan pola yang sudah ada di `boq`. Hindari ubah PK cluster menjadi numerik karena sudah widespread di kode dan API.

---

## 3. Rekomendasi Urutan Migration per Entitas

Dari yang paling aman (existing data bisa di-backfill penuh, tidak ada data yatim):

1. **`boq_item`** — backfill 100% via `boq.cluster_id` (0 row NULL di `boq.cluster_id`). Migration: ADD COLUMN `cluster_id` TEXT, backfill via JOIN, tambah FK.
2. **`stok_gudang`** — backfill via `gudang.project_id` → cari cluster terbaru per project. Migration: ADD COLUMN `cluster_id` TEXT nullable dulu, backfill, lalu opsional NOT NULL.
3. **`surat_jalan_item`** — backfill via `surat_jalan.boq_id` → `boq.cluster_id` (perlu handle `boq_id` NULL).
4. **`permintaan_boq`** — kecil (2 row), backfill via `tiket_id` → `tiket_material.cluster_id`.
5. **`return_transaction`** — kecil (5 row), backfill via `tiket_id` atau `surat_jalan_item_id`.
6. **`laporan_mitra`** — backfill via `tiket_id` → `tiket_material.cluster_id` (handle 3 NULL).
7. **`stok_ledger`** — backfill via `surat_jalan_item` atau `return_transaction` (bergantung pada step sebelumnya).

**Tidak perlu ditambahkan cluster_id:**
- `surat_jalan_item_foto`, `surat_jalan_item_pick` — child items, filter cluster lewat parent `surat_jalan_item`
- `reconciliation_upload_detail` — data batch, bukan transaksi harian

---

## 4. Risiko

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| **Data yatim** `tiket_material.cluster_id` (3 NULL) | `laporan_mitra` dan `return_transaction` yang tergantung pada tiket ini tidak bisa di-backfill cluster | Tambah kolom `cluster_id` sebagai nullable, biarkan NULL untuk data yatim |
| **Barang lintas cluster** | Satu `barang` bisa dipakai di banyak cluster (melalui BOQ berbeda) — tidak ada 1-to-1 | Jangan tambah `cluster_id` ke `barang` master. Tambah ke transactional entities saja |
| **Constraint FK NOT NULL** pada `cluster_id` di transactional tables | Data lama tanpa cluster_id akan gagal INSERT | Gunakan nullable dulu, backfill, lalu pertimbangkan NOT NULL setelah verifikasi |
| **ON DELETE RESTRICT vs CASCADE** pada FK `boq.cluster_id` | Menghapus cluster bisa gagal jika masih ada BOQ aktif | Saat ini tidak ada ON DELETE yang didefinisikan untuk `boq.cluster_id` — default Prisma adalah `Restrict` |
| **Backfill stok_gudang** yang `project_id` NULL (4 row) | Tidak bisa ditentukan cluster dari project | Perlu hand-assign atau biarkan NULL |

---

## 5. Pertanyaan yang Perlu Dipecahkan

1. **Apakah `barang` master perlu `cluster_id`?** — Saat ini tidak perlu karena barang adalah master data yang bisa dipakai lintas cluster. Konfirmasi apakah ada kebutuhan filter barang per cluster.
2. **Apakah `cluster_id` di transactional tables harus NOT NULL?** — Jika ya, perlu strategy untuk data yatim (misal: cluster "UNASSIGNED").
3. **Apakah `tiket_material.cluster_id` perlu ditambahkan FK eksplisit?** — Saat ini hanya kolom teks, tidak ada FK.
4. **Apakah `stok_gudang` yang `project_id` NULL (4 row) perlu di-backfill terlebih dahulu sebelum menambah `cluster_id`?**
5. **Apakah `reconciliation_upload_detail` memang tidak perlu `cluster_id`?** — Saat ini data batch tanpa cluster, tapi bisa ditambahkan jika diperlukan untuk filter.
6. **Apakah urutan migration di atas sudah benar, atau ada prioritas lain?** — Misal: `laporan_mitra` lebih penting daripada `stok_ledger`.
7. **Apakah perlu kolom `cluster_id` di `surat_jalan` (bukan `surat_jalan_item`)?** — Karena `surat_jalan` sudah punya `boq_id` → `boq.cluster_id`, bisa ditambahkan untuk query cepat.
