# Fix Task 5 / K7: Pembatasan Akses Staf Gudang pada Modul Cluster & BOQ

## Ringkasan masalah

Staf Gudang (role `staf_gudang` → `STAFF`) bisa mengakses fitur manajemen Cluster & BOQ:

1. **Backend** — `GET /api/clusters` dan `GET /api/clusters/all` hanya memakai
   `authenticate` (role apa pun boleh). Beberapa endpoint BOQ juga terbuka
   (`/api/boqs`, `/api/boqs/items`, `/api/boqs/:id`, …).
2. **Frontend** — halaman `/dashboard/boq` bisa dibuka staf lewat URL langsung
   (halaman tersebut memang punya accommodates `isStaffGudang`), dan
   `/master-data` (tab Cluster) juga tanpa penjaga role.
3. **Form Surat Jalan staf** mengambil data cluster/BOQ dari endpoint manajemen,
   sehingga saat endpoint dibatasi, dropdown BOQ ikut kosong.

## Solusi

### Backend

1. **Endpoint manajemen dibatasi (403 untuk staf)**
   - `backend/src/modules/cluster/cluster.routes.js` → `GET /`, `GET /all` kini
     memakai `authorize("ADMIN", "SUPERVISOR")` (tambah/ubah/hapus sudah begitu).
   - `backend/src/modules/boq/boq.routes.js` → seluruh endpoint manajemen
     (`/`, `/stats`, `/areas`, `/items`, `/check-ticket`, `/export`,
     `/export-matrix`, `/:id`, `/:id/summary`, `/:id/status`, `/:id/verification`)
     memakai `authorize("ADMIN", "SUPERVISOR")`; hapus & restore tetap `ADMIN`.
2. **Endpoint read-only khusus staf (hanya data seperlunya)**
   - `GET /api/clusters/options` → `{ cluster_id, nama_cluster, project_id, project_name }`
   - `GET /api/boqs/options` → `{ boq_id, boq_number, kode_tiket, status, cluster_id,
     nama_cluster, project_id, project_name }` (+ alias camelCase)
   - `GET /api/boqs/options/items` → item BOQ `{ barang_id, kode_perangkat,
     nama_barang, unit, qty_rencana, additional, mos }`
   - `GET /api/boqs/options/:id` → detail BOQ minimal + daftar item
   - Router & controller/service/repository baru:
     `cluster.repository.findOptions`, `cluster.service.findOptions`,
     `cluster.controller.listOptions`, `boq.repository.findOptions`,
     `boq.repository.findOptionDetail`, `boq.service.findOptions`,
     `boq.service.findOptionDetail`, `boq.controller.listOptions`,
     `boq.controller.listOptionItems`, `boq.controller.getOptionDetail`.
   - `/options*` didaftarkan **sebelum** `/:id` agar tidak tertangkap route param.
3. **Testability** — `backend/src/middlewares/role.middleware.js` kini mengekspos
   `middleware.allowedRoles` agar tabel route bisa diverifikasi tanpa menjalankan server.

### Frontend

4. **Route guard**
   - `frontend/app/dashboard/boq/page.tsx` → staf diarahkan ke `/staff/dashboard`;
     pemanggilan endpoint manajemen dilewati untuk staf.
   - `frontend/app/master-data/layout.tsx` → staf diarahkan ke `/staff/dashboard`
     (menutup tab Cluster di Master Data).
5. **Form Surat Jalan staf memakai endpoint read-only**
   - `frontend/app/staff/outbound/new/page.tsx` → `/api/clusters/options`,
     `/api/boqs/options`, `/api/boqs/options/items`.
   - `frontend/app/staff/inbound/new/page.tsx` → `/api/clusters/options`,
     `/api/boqs/options`, `/api/boqs/options/:id`.
   - `frontend/components/BoqPicker.tsx` → `/api/boqs/options`.
6. **Menu & tautan**
   - `frontend/lib/navigation.ts` → entri "Cluster & BOQ" & "Master Data" tetap
     hanya `admin`/`supervisor` (dokumentasi aturan K7 pada komentar).
   - `frontend/lib/navigation.ts` → helper baru `canAccessBoqModule(role)`.
   - `SuratJalanInboundDetailView.tsx`, `DetailSuratJalanDocument.tsx`,
     `app/staff/outbound/[suratJalanId]/page.tsx`,
     `app/staff/inbound/[suratJalanId]/page.tsx` → nomor BOQ ditampilkan sebagai
     teks (tanpa link ke `/dashboard/boq`) untuk staf.

## Hasil test

- `npm test` (backend): **197 test lulus, 0 gagal** (10 test baru di
  `backend/src/modules/boq/boq.access-control.test.js`).
- `npx tsc --noEmit` (frontend): tidak ada error pada file yang diubah
  (error yang tersisa berasal dari artefak `.next/types/validator.ts` yang usang).
- `npx eslint` pada file yang diubah: jumlah error sama dengan sebelum perubahan
  (baseline HEAD = 9 error pada `dashboard/boq/page.tsx`, tidak ada error baru).

## Skenario pengujian

### Staf Gudang

1. Login sebagai staf → sidebar **tidak** menampilkan "Cluster & BOQ" maupun
   "Master Data".
2. Buka `/dashboard/boq` langsung → diarahkan ke `/staff/dashboard`.
3. Buka `/master-data` langsung → diarahkan ke `/staff/dashboard`.
4. Panggil `GET /api/boqs` / `GET /api/boqs/1` / `GET /api/clusters` →
   **403 Forbidden** (tercatat pada `audit_log` dengan `entity_type=access_attempt`).
5. Panggil `GET /api/boqs/options` / `GET /api/clusters/options` → **200 OK**
   dengan data minimal.
6. Form **Surat Jalan → Outbound (Baru)**: pilih Project → dropdown Cluster & BOQ
   terisi; daftar item BOQ (qty rencana, additional, MOS) tampil normal.
7. Form **Surat Jalan → Inbound (Baru)**: pilih Project → Cluster terisi; BOQ aktif
   terisi; daftar barang BOQ untuk pencocokan kondisi tampil normal.

### Admin & Supervisor

8. `/dashboard/boq`, `/dashboard/supervisor/boq`, `/master-data` tetap terbuka
   penuh (daftar, detail, tambah, ubah, export).
9. Endpoint `/api/boqs` & `/api/clusters` tetap 200 untuk Admin/Supervisor.
