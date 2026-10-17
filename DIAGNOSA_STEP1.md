# DIAGNOSA STEP 1 - Aplikasi Digitak Warehouse (Next.js + Backend)

## A. SISI SUPERVISOR (SUMBER KEBENARAN)

### 1. Komponen UI "Rekonsiliasi Hardware per Cluster"
- frontend\components\ClusterReconciliationSection.tsx:1-115
  UI component untuk menampilkan rekonsiliasi per cluster. Tampilkan card per cluster dengan nama cluster, nama project, jumlah material (items), badge status (Sesuai/Perhatian/Berjalan berdasarkan cluster.status). Menghitung progress: jika used > 0 pakai (used/boqPlan)*100, else pakai (mos/boqPlan)*100 sebagai placeholder. Menampilkan pesan placeholder jika progressPercentage==0: "*Belum ada realisasi, menampilkan persentase MOS sebagai placeholder" (line ~67). Menampilkan 5 komponen: BOQ Plan, Additional (+), MOS (bg-emerald), Used (bg-orange), Remains (merah jika < 0).

- frontend\app\dashboard\supervisor-dashboard.tsx:144
  Merender <ClusterReconciliationSection ...> untuk dashboard supervisor.


### 2. Alur Data (Supervisor)
- frontend\hooks\use-supervisor-dashboard.ts:181-248
  Hook memanggil API untuk data supervisor. Salah satunya: get(${API_BASE}/api/reconciliation/inventory?) dengan parameter groupBy=cluster (line ~208-209). Juga memanggil project-summary dll, tapi untuk cluster reconciliation utama dari reconciliation API.
- frontend\hooks\use-supervisor-dashboard.ts:248-296
  Parsing response reconciliation: mengambil json?.data (array) lalu setClusterReconciliation(buildClusterReconciliation(data)) (line ~295). Data per baris dari API groupBy=cluster berisi kolom: cluster_id, nama_cluster, projectNama/projectnama, boq, additional, mos, used, remains, status.

- frontend\lib\cluster-reconciliation.ts:1-120
  Shared builder: uildClusterReconciliation() meng-group by key = clusterId || \\::tanpa-cluster\`. Untuk tiap row menambah nilai (boq, additional, mos, used, remains), menghitung flags hasPerhatian/hasSesuai (dari row.status), menghitung items (jumlah material/baris), lalu final status = hasPerhatian ? 'perhatian' : hasSesuai ? 'sesuai' : 'berjalan'. Sort by clusterName (id-ID, numeric).

- backend\src\modules\reconciliation\reconciliation.controller.js:5-14
  getInventory menerima actor (req.user) dan meneruskan ke service.

- backend\src\modules\reconciliation\reconciliation.service.js:46-50
  Service langsung delegasi ke repository: eturn await reconciliationRepository.getInventory(filters, actor);

- backend\src\modules\reconciliation\reconciliation.repository.js:1-900+ (core logic)
  Fungsi getInventory(filters, actor) menerima groupBy (default 'project'). Jika groupBy === 'cluster' (line ~266+), logic berjalan dengan mode cluster:
  - Membangun query untuk oqItems (PRISMA) dengan filter projectId/warehouseId sesuai. Include cluster/project/tiket/barang/satuan/gudang_tujuan (line ~295-380)
  - Ambil import saldo awal dari oq_item (qty_additional, qty_mos, qty_used) dan disimpan per cluster-barang/project-barang (line ~383-425)
  - Bangun projectClusterMap, cluster IDs, dan resolve clusterId untuk shipment/laporan (line ~427-680+)
  - Untuk mode cluster: menghitung inbound/outbound/additional/used/MOS per cluster-barang (MOS = inbound only external vendor - isMosEligibleInbound) (line ~650-780+)
  - Aggregasi ke level cluster-barang: collect boq, kode_tiket_list, gudang/satuan, boq_list; apply remains_note untuk mode cluster (line ~780-900+). Terakhir return { data: rows }.


### 3. Rumus & Logika (Supervisor - source of truth)
Berdasarkan frontend (ClusterReconciliationSection) dan backend (reconciliation.utils/build logic):

- BOQ Plan (cluster.boqPlan): total qty_rencana (BOQ) per cluster, aggregated dari boq_items yang relevan (backend mengumpulkan agg.boq += qty_rencana). Pada frontend ditampilkan sebagai cluster.boqPlan.toLocaleString('id-ID').
- Additional: total additional per cluster. Backend menambah dditionalByClusterBarangFromAdjustment (cluster-level + legacy mapped) + importValues. Frontend menampilkan +cluster.additional.
- MOS (Material on Site): inbound external/vendor eligible untuk MOS (isMosEligibleInbound) + import mos. Frontend menampilkan dengan tone emerald. 
- Used: outbound non-gudang tujuan? Atau laporan_mitra.used / derived. Backend: used = (laporan used > 0 ? laporan used : outbound non-gudang) + import used. Frontend tone orange.
- Remains: computeRemains(mos, agg.boq, additional) - rumus canonical dari backend (reconciliation.utils). Frontend menampilkan merah jika < 0.
- Persentase progress (UI): 
  - progressPercentage = boqPlan > 0 ? min(max((used/boqPlan)*100,0),100) : 0
  - fallbackPercentage = boqPlan > 0 ? min(max((mos/boqPlan)*100,0),100) : 0
  - displayPercentage = progressPercentage > 0 ? progressPercentage : fallbackPercentage
  - Bar warna: amber jika progressPercentage>0, else emerald/60. Placeholder text muncul jika progressPercentage==0.
- Badge status (cluster level): frontend map cluster.status -> 'Sesuai'|'Perhatian'|'Berjalan'. Backend builder (lib/cluster-reconciliation) menghasilkan: status = hasPerhatian ? 'perhatian' : hasSesuai ? 'sesuai' : 'berjalan' (berdasarkan row.status dari API). Backend repository compute status per row via computeReconciliationStatus(remains) (lihat repository code path) - status row dipengaruhi remains. Aggregasi ke cluster-level di frontend builder berdasarkan flags dari rows.
- Logika placeholder: "Belum ada realisasi, menampilkan persentase MOS sebagai placeholder" - berarti belum ada used (progress 0), sehingga ditampilkan persentase MOS sebagai fallback.


### 4. Definisi "cluster" & Filter/Scoping (Supervisor)
- Definisi cluster: tabel cluster (prisma model implied) dengan relasi ke project (project_id), memiliki 
ama_cluster, cluster_id (string/uuid). BOQ terkait via oq.cluster_id atau oq.tiket.cluster_id. Repository memetakan cluster_id dari berbagai sumber (boq item, shipment, laporan) dengan fallback ke projectClusterMap bila hanya project diketahui dan unik.
- Scoping supervisor: Dashboard supervisor menggunakan hook use-supervisor-dashboard yang fetch reconciliation dengan query params warehouseId/projectId/groupBy=cluster (line ~208). Backend reconciliation service/controller menerima actor tapi implementasi repository getInventory umumnya tidak membatasi berdasarkan role supervisor secara ketat di level query (kecuali ada logic spesifik) - namun komentar di dashboard service/repo menunjukkan "scoping supervisor per-gudang dihapus" (revert) jadi supervisor bisa melihat semua (sama admin) sesuai kode yang dibaca. Perlu dicatat: hook supervisor tetap mengirim filter warehouseId/projectId dari state-nya.
- Filter yang dipakai: search, projectId, warehouseId, status, groupBy, clusterId (backend menerima filters ini).

### 5. Tipe/Interface & Response Shape
- Frontend: ClusterReconciliation type (frontend\lib\cluster-reconciliation.ts:7-18): clusterId, clusterName, projectName, boqPlan, additional, mos, used, remains, status, items.
- Raw row dari API (groupBy=cluster): cluster_id, nama_cluster, projectnama/projectNama, boq, additional, mos, used, remains, status.
- Response API: GET /api/reconciliation/inventory?groupBy=cluster return { success, message, data: RawReconciliationRow[] } (parsed by hook).


## B. SISI ADMIN (YANG AKAN DIUBAH)

### 1. Komponen "Ringkasan per Project/Cluster"
- frontend\app\dashboard\page.tsx:419 (main dashboard - admin)
  Section title "Ringkasan per Project/Cluster" (line ~420-432). Terdiri dari search box dan grid cards.
- frontend\app\dashboard\page.tsx:450-556
  Rendering cards per project: menampilkan projectName, badge status (berdasarkan p.status), area + clusterId/clusterLabel + statusBoq, Total Item (formatNumber(p.mos) - line ~501). Progress bar stacked: MOS (emerald), Used (orange), Remains (rose/grey). Grid 5 metric: BOQ Plan, Additional, MOS, Used, Remains (tone sesuai nilai). Data berasal dari ilteredProjects yang dibentuk dari projectRows.

### 2. Alur Data (Admin)
- frontend\app\dashboard\page.tsx:295-365 (fetch)
  Admin dashboard memanggil beberapa API termasuk get(${apiBase}/api/dashboard/project-summary) (line ~323). Response di-parse: projectSummaryJson?.data -> setProjectSummary (line ~356-364).
- frontend\app\dashboard\page.tsx:403-407
  const projectRows = projectSummary.map((p) => { ... }) - transform data dari API ke bentuk yang dirender (menggunakan p.hardwareOnSite, p.mos, p.boq, p.additional, p.used, p.remains, p.status, p.progress, p.clusterId, p.clusterLabel, p.statusBoq).
- frontend\app\dashboard\page.tsx:90-110 (types)
  Type ProjectSummaryRow (frontend): projectId, projectName, clusterId (string|null), clusterLabel, area, statusBoq, hardwareOnSite, mos, boq, additional, used, remains, status ('sesuai'|'perhatian'|'belum_ada_data'), progress.

- backend\src\modules\dashboard\dashboard.routes.js:10
  outer.get("/project-summary", authenticate, dashboardController.getProjectSummary)
- backend\src\modules\dashboard\dashboard.controller.js:19-33
  Delegasi ke service.getProjectSummary()
- backend\src\modules\dashboard\dashboard.service.js:17-20
  Service memanggil repository.getProjectSummary()
- backend\src\modules\dashboard\dashboard.repository.js:234-356
  getProjectSummary():
  - Ambil projects aktif (order by area, nama_project). select project_id, nama_project, title, cluster_id, area.
  - Panggil econciliationRepository.getInventory({}, null) untuk mendapatkan reconRows (line ~252-259). Ini adalah data per-barang-per-project (mode default groupBy project).
  - Agregasi per projectId: menjumlahkan boq, additional, mos, used, approved_return_qty, remains, mengumpulkan statuses, hasBoq, boqStatuses, itemCount. Juga track clusterIdByProject dari row.cluster_id (line ~261-305).
  - Map kembali ke response dengan field: projectId, projectName, clusterId, clusterLabel (format "RW ..." jika ada), area, statusBoq (berdasarkan boqStatuses: 'Aktif' jika ada aktif, else 'Draft' jika ada, else 'Belum Ada'), hardwareOnSite = mos, mos, boq, additional, used, remains, itemCount, status (reconStatus dari aggregateProjectStatus(statuses)), progress (used/mos*100 jika mos>0).


### 3. Perhitungan Sekarang (Admin) vs Target
- Agregasi saat ini (Admin): PER PROJECT. Dashboard repository meng-aggregate dari reconciliation rows (groupBy project) ke level project. UI menampilkan 1 card per project.
- Data yang ditampilkan: nama project, cluster info (clusterId/clusterLabel dari data), area, statusBoq, 5 komponen (boq, additional, mos/hardwareOnSite, used, remains), status badge per project, stacked progress bars (MOS/Used/Remains) dengan maxVal = max(1, boq+additional).
- Target: section admin HARUS SAMA PERSIS dengan Rekonsiliasi Hardware per Cluster milik Supervisor - baik UI maupun fungsi/perhitungan (PER CLUSTER, 5 komponen yang sama, status, progress bar, dsb). Artinya agregasi harus berubah dari per-project ke per-cluster, dan UI harus mengikuti pola ClusterReconciliationSection (card per cluster, logic progress + placeholder, badge status cluster-level, dll.).

- Filter/scope/pagination/sorting (Admin saat ini): Ada search box "Cari project atau area..." (frontend\app\dashboard\page.tsx:434-447) yang filter projectRows berdasarkan projectName/area. Tidak terlihat pagination/sorting eksplisit di UI section ini. Scope role: admin (page guard membatasi akses). Data diambil via /api/dashboard/project-summary (tanpa filter query params dari UI section ini).


## C. PERBANDINGAN & ANALISIS GAP

### 1. Tabel Perbandingan

| Aspek | Supervisor | Admin (saat ini) |
|---|---|---|
| Komponen UI | ClusterReconciliationSection (card per cluster) | Section "Ringkasan per Project/Cluster" di dashboard/page.tsx (card per project) |
| Agregasi | PER CLUSTER (groupBy=cluster) | PER PROJECT (dari /api/dashboard/project-summary yang meng-aggregate data reconciliation mode project) |
| Sumber data API | GET /api/reconciliation/inventory?groupBy=cluster | GET /api/dashboard/project-summary (backend memanggil reconciliationRepository.getInventory({}, null) mode project) |
| Builder logic | buildClusterReconciliation (frontend lib) + backend cluster grouping | Backend aggregateProjectStatus + mapping manual di repo/service |
| 5 Komponen | boqPlan, additional, mos, used, remains | boq, additional, mos/hardwareOnSite, used, remains (nama field mirip tapi agregasi berbeda level) |
| Status | Cluster-level: 'perhatian'/'sesuai'/'berjalan' (dihitung dari flags row.status) | Project-level via aggregateProjectStatus(statuses) -> 'sesuai'/'perhatian'/'belum_ada_data' |
| Progress bar | Single bar: displayPercentage = (used>0 ? used/boqPlan : mos/boqPlan), warna beda jika placeholder, + text placeholder jika progress==0 | Stacked bars (MOS, Used, Remains) dengan maxVal = max(1, boq+additional) |
| Placeholder text | Ada: "*Belum ada realisasi, menampilkan persentase MOS sebagai placeholder" (jika progressPercentage==0) | Tidak ada |
| Filter | Bisa filter warehouseId/projectId (state dari hook) mempengaruhi query reconciliation | Hanya search lokal (project/area) di UI, tidak kirim filter ke API |
| Tipe data | ClusterReconciliation[] | ProjectSummaryRow[] (per-project) |


### 2. Reuseable vs Role-Tied

Yang BISA dipakai ulang (shared):
- rontend\lib\cluster-reconciliation.ts - type ClusterReconciliation + uildClusterReconciliation() adalah logic agregasi cluster yang sudah bersih dan terpisah. Ini adalah kandidat kuat untuk dipakai ulang oleh admin.
- Komponen rontend\components\ClusterReconciliationSection.tsx - UI component per-cluster. Bisa digunakan langsung oleh admin (props clusters: ClusterReconciliation[]). Ini akan memastikan UI IDENTIK persis dengan supervisor.
- Backend: econciliationRepository.getInventory dengan groupBy=cluster sudah mengembalikan data teragregasi per cluster (dengan perhitungan yang konsisten). Bisa dipakai admin untuk mendapatkan data cluster-level.
- econciliation.utils (computeRemains, computeReconciliationStatus, aggregateProjectStatus) - logika perhitungan canonical bisa dipakai.

Yang TERIKAT role supervisor (saat ini):
- use-supervisor-dashboard.ts menggabungkan banyak concern (metrics, queue, assessment, dsb) dan spesifik untuk dashboard supervisor. Tapi bagian fetch reconciliation-nya bisa diadaptasi.
- Backend tidak terlihat ada pembatasan ketat berdasarkan role untuk getInventory (berdasarkan pembacaan kode), tapi UI supervisor mengirim filter tertentu. Perlu hati-hati soal scope akses (lihat poin 3).

### 3. Hak Akses & Dampak
- Supervisor: hanya melihat cluster miliknya? Saat ini hook supervisor mengirim warehouseId dan projectId dari state (bisa "all"). Backend reconciliation getInventory menerima filters tersebut. Tidak ada pembatasan eksplisit role-based di repository yang dibaca, tapi mungkin di layer authorization middleware/route tertentu. Dampak query: filter tambahan bisa mempersempit result set (lebih ringan). UI supervisor punya filterActive flag.
- Admin: kemungkinan melihat SEMUA (tidak dibatasi project/warehouse tertentu). Ini perlu dipertahankan. Jika menggunakan API reconciliation dengan groupBy=cluster, pastikan admin bisa akses semua data (tanpa pembatasan role yang mereduksi data supervisor).
- Dampak pada performa: mode cluster melakukan lebih banyak agregasi (resolve cluster, mapping, additional by cluster) tapi dataset biasanya terkelompok. Jika admin butuh semua data tanpa filter, load bisa lebih besar - perlu pertimbangkan pagination? Saat ini section tidak ada pagination, menampilkan grid. Untuk banyak cluster mungkin perlu pertimbangan, tapi diagnosa ini fokus pada kesamaan logika/UI.
- UI: admin butuh mempertahankan kemampuan search? Saat ini ada search lokal per project/area. Jika berubah ke per-cluster, search perlu bisa mencakup clusterName, projectName, area. Juga mungkin perlu grouping per project atau tidak (target minta sama persis dengan supervisor = card per cluster, bisa dikelompokkan oleh project seperti di supervisor? Lihat UI supervisor: card per cluster, tiap card tampil projectName).


## D. RISIKO & REKOMENDASI

### 1. Edge Case
- Cluster tanpa BOQ: saat ini BOQ Plan 0. Progress jadi fallback ke MOS/BOQ -> jika BOQ 0, progressPercentage = 0, displayPercentage = 0 (keduanya 0 karena boqPlan>0 false). UI akan menampilkan bar 0% dan placeholder text muncul. Perlu verifikasi perilaku ini sudah benar.
- Project dengan banyak cluster: admin saat ini 1 card per project; target jadi banyak card per cluster. Layout grid md:grid-cols-2 tetap bisa dipakai (sama seperti supervisor). Performa render perlu dipertimbangkan jika sangat banyak.
- Pembagian dengan nol (division by zero): sudah ditangani (check boqPlan > 0).
- Data null: banyak penggunaan || 0, trim(), fallback '-'. Perlu pastikan clusterName tidak kosong (builder sudah handle).
- Cluster tanpa cluster_id / tanpa cluster: key fallback 	anpa-cluster mungkin muncul; perlu dicek apakah ini valid case.
- Perbedaan field naming: backend project-summary pakai hardwareOnSite vs mos - konsistensi penting saat mapping.

### 2. File yang Kemungkinan Perlu Diubah/Dibuat
Berdasarkan analisis:

- frontend\app\dashboard\page.tsx (admin dashboard)
  Alasan: mengganti section "Ringkasan per Project/Cluster" dari per-project ke per-cluster. Bisa mengganti rendering untuk menggunakan ClusterReconciliationSection, atau replikasi logic. Juga perlu fetch data dari /api/reconciliation/inventory?groupBy=cluster alih-alih /api/dashboard/project-summary.

- frontend\lib\cluster-reconciliation.ts (sudah ada - shared)
  Alasan: pastikan builder cukup generik untuk dipakai admin. Sudah shared, mungkin perlu dipastikan tidak ada asumsi role-specific.

- frontend\components\ClusterReconciliationSection.tsx (sudah ada - shared)
  Alasan: siap dipakai ulang untuk admin. Tidak perlu ubah jika target sama persis.

- frontend\hooks\use-dashboard.ts? (TIDAK DITEMUKAN - admin pakai page.tsx langsung)
  Admin dashboard tidak pakai custom hook terpisah seperti supervisor; logic fetch ada inline di page.tsx. Perlu diputuskan: buat hook baru (mis. use-admin-cluster-recon) atau inline fetch.

- backend\src\modules\dashboard\dashboard.repository.js / service.js / controller.js
  Alasan: /api/dashboard/project-summary saat ini meng-aggregate per-project. Target admin berubah ke per-cluster. Bisa: (1) ubah endpoint project-summary untuk return cluster-level data dengan shape yang kompatibel dengan ClusterReconciliation, atau (2) biarkan endpoint lama dan admin fetch langsung /api/reconciliation/inventory?groupBy=cluster. Opsi (2) lebih hemat duplikasi logic karena reconciliation repo sudah ada logic cluster lengkap.

- Optional: buat shared type jika perlu (sudah ada di frontend/lib). Backend mungkin perlu shape serupa.

### 3. Rencana Implementasi Berurutan (maks 6 langkah aman)

Langkah-langkah aman untuk step berikutnya (tanpa mengubah file sekarang - hanya implementasi nanti):

1. **Ambil data cluster-level untuk admin**: Ubah frontend\app\dashboard\page.tsx untuk fetch /api/reconciliation/inventory?groupBy=cluster (dengan filter opsional jika dibutuhkan). Parsing pakai uildClusterReconciliation dari shared lib. Ini menggantikan pemakaian /api/dashboard/project-summary untuk section ini.
2. **Ganti UI section admin**: Ganti rendering section "Ringkasan per Project/Cluster" dengan menggunakan <ClusterReconciliationSection clusters={...} isLoading={...} emptyMessage="..." filterActive={...}/> agar UI identik persis dengan supervisor.
3. **Sesuaikan filter/search**: Tambahkan search lokal untuk filter clusters (berdasarkan clusterName/projectName/area) jika diperlukan, atau samakan behavior. Pertimbangkan apakah perlu mempertahankan search yang ada - target minta "sama persis" UI/fungsi; search bisa disesuaikan.
4. **Verifikasi scope akses**: Pastikan endpoint reconciliation mengizinkan admin mengakses semua data (tidak ada role restriction yang membatasi). Cek middleware/authorization. Jika ada pembatasan, perlu penyesuaian - tapi dari pembacaan kode terlihat tidak ada pembatasan ketat per-role di getInventory.
5. **Cleanup (opsional)**: Jika project-summary tidak dipakai lagi untuk section ini, bisa dibiarkan atau dicatat - tapi tidak wajib dihapus.
6. **Validasi angka**: Bandingkan sample data antara supervisor (groupBy=cluster) vs hasil admin yang baru dengan data yang sama untuk memastikan perhitungan identik.

