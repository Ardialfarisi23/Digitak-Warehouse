# Rencana Step 2: Rekonsiliasi per-Cluster

## 1. Atribusi Metrik

| Metrik | Path cluster_id | Null risk | Fallback |
|--------|-----------------|-----------|----------|
| boq | `boq.cluster_id` (NOT NULL) | Tidak | - |
| additional | `surat_jalan.boq?.cluster_id` | Rendah | `surat_jalan.project?.cluster_id` |
| mos | `surat_jalan.boq?.cluster_id` | Rendah | `surat_jalan.project?.cluster_id` |
| used | `laporan_mitra.tiket.boq?.cluster_id` → `tiket.cluster_id` → `tiket.project.cluster_id` | **Sedang** | Lihat opsi |
| pick summary | `surat_jalan.boq?.cluster_id` | Rendah | `surat_jalan.project?.cluster_id` |
| temuan penerimaan | `surat_jalan.boq?.cluster_id` | Rendah | `surat_jalan.project?.cluster_id` |

**Opsi untuk `used` yang tidak bisa diatribusikan:**
- A. Skip row dari cluster-level aggregation — data bersih, tidak distorsi. Rekomendasi awal.
- B. Fallback ke `project.cluster_id` — retains lebih banyak row, tapi legacy nullable bisa mengelompokkan ke cluster yang salah jika project punya banyak cluster.
- C. Tambah kolom `cluster_id` ke `laporan_mitra` — paling akurat, tapi perlu migration + backfill + update semua path create.

**Rekomendasi: Opsi A.** Monitor rasio eksklusi; jika >20%, naikkan ke Opsi C.

## 2. Kontrak API

**Endpoint**: `GET /api/reconciliation/inventory`

**Query params**:
- `groupBy=project` (default, legacy) | `groupBy=cluster` (baru)
- `clusterId=<text>` (filter cluster, opsional)
- `projectId`, `warehouseId`, `status`, `search` (sudah ada, diaktifkan)

**Response `groupBy=cluster`** (baru):
- Kunci: `id = "${clusterId}-${barangId}"`
- Field baru: `cluster_id`, `nama_cluster`, `pic_nama`, `pic_sumber` ('internal'|'mitra'|null)
- Field lama dipertahankan: `project_id`, `project_nama`, `area`, `tiket_id`, `kode_tiket`, `barang_id`, `kode_perangkat`, `nama_barang`, `gudang_nama`, `satuan`, `boq`, `additional`, `mos`, `used`, `approved_return_qty`, `remains`, `status`, `pick_source`, `qty_picked_total`, `pick_breakdown`, `qty_override_total`, `pick_mismatch`, `temuan_penerimaan`

**Response `groupBy=project`** (legacy):
- Format existing tetap: `id = "${projectId}-${barangId}"`
- Field cluster/PIC di-set `null`/`"-"`

**Keputusan**: Default `groupBy=project`. Halaman reconciliation mengirim `groupBy=cluster`. Dashboard dan FE lain tetap dapat format legacy tanpa perubahan.

## 3. Dampak Dashboard

- `dashboard.repository.js L209-243` (`getProjectSummary`): memanggil `reconciliationRepository.getInventory({}, null)`. Jika default berubah ke cluster, aggregasi akan double-count. **Tidak jadi masalah** karena default tetap `project`.
- `frontend/app/dashboard/page.tsx L252-312`: dedupe by `project_id`. Jika dapat cluster rows, data akan terpotong. **Tidak jadi masalah** karena default tetap `project`.
- `dashboard.service.js getHardwareReconciliation`: **TIDAK disentuh**. Endpoint `/api/dashboard/reconciliation` tidak dipakai oleh FE yang terdeteksi, dan reports tidak diubah.

## 4. Rencana Implementasi

**3a: Schema + migration + CRUD cluster**
- File: `backend/prisma/schema.prisma`, migration, cluster controller/service
- Inti: tambah `cluster.pic_id` + relation ke `personil`, update CRUD cluster untuk accept `pic_id`
- Verifikasi: `npx prisma migrate dev`, cek column via DB client, test create/update cluster dengan PIC
- Risiko: migration gagal di existing data (NULL allowed, aman)

**3b: Repository + utils + validation + controller**
- File: `reconciliation.repository.js`, `reconciliation.utils.js`, `reconciliation.validation.js`, `reconciliation.controller.js`
- Inti: agregasi kunci `${clusterId}-${barangId}`, filter `clusterId`, `groupBy` param, include `cluster.pic`, fallback `pic_mitra` terbaru
- Verifikasi: curl `/api/reconciliation/inventory?groupBy=cluster`, cek field baru dan jumlah row
- Risiko: performa query naik (lebih banyak join), used dengan cluster null ter-exclude

**3c: Frontend admin reconciliation**
- File: `frontend/app/dashboard/reconciliation/page.tsx`
- Inti: kirim query params ke API, tambah kolom Cluster & PIC di tabel, tambah filter cluster, update export
- Verifikasi: buka halaman, cek filter cluster works, kolom PIC tampil, export includes new columns
- Risiko: breaking jika API response format beda dari ekspektasi

**3d: Frontend supervisor + dashboard**
- File: `frontend/app/dashboard/supervisor/reconciliation/page.tsx`, `frontend/app/dashboard/page.tsx`
- Inti: sama seperti admin page untuk supervisor; dashboard tidak diubah (default API `groupBy=project`)
- Verifikasi: supervisor page tampil cluster-level, dashboard main tetap sama
- Risiko: supervisor page belum ada filter cluster, perlu ditambahkan

## 5. Pertanyaan Terbuka

1. **Format `nama_cluster`**: Apakah menggunakan `cluster.nama_cluster` langsung, atau butuh format khusus (mis. "RW 01 / Cluster A")?
2. **PIC Mitra fallback**: Apakah `pic_mitra` terbaru dihitung berdasarkan `tanggal_laporan` atau `uploaded_at` dari `laporan_mitra`?
3. **Cluster tanpa PIC**: Jika `cluster.pic_id` NULL dan tidak ada `laporan_mitra` untuk cluster tersebut, apakah kolom PIC tampil "-" atau "Belum diatur"?
