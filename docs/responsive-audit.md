# Responsive Audit — Burger Menu Diagnosa

CHECKPOINT Burger: langkah 1 selesai

## Langkah 1 — sidebar-context.tsx
- `isMobile` dihitung via `window.innerWidth < 768` di `useEffect` (line 32-33), listener `resize` terpasang (line 38).
- State: `collapsed`, `isMobile`, `mobileOpen` (line 21-29).
- Fungsi `toggle()` (line 42-48) hanya mengubah `collapsed` + localStorage, TIDAK mengubah `mobileOpen`. Tidak ada toggle khusus mobile.

CHECKPOINT Burger: langkah 2 selesai

## Langkah 2 — GlobalHeader.tsx
- Tombol burger (line 110-119): `onClick={() => setMobileOpen(true)}` (line 113).
- Tombol HANYA di-render jika `isMobile` (line 110: `{isMobile && ...}`) — tidak ada disabled/hidden.
- Header class: `fixed top-0 right-0 z-40 ... left-0 md:left-[var(--sidebar-w)]` (line 108). Z-40, tidak ada backdrop-blur/overflow yang menghalangi.

CHECKPOINT Burger: langkah 3 selesai

## Langkah 3 — CompactSidebar.tsx
- Sidebar mobile (line 190-210): `fixed left-0 top-0 z-50 h-dvh w-64 transform ... md:hidden`, conditional `translate-x-0` vs `-translate-x-full` saat TERTUTUP.
- Backdrop (line 184-189): `fixed inset-0 z-40 bg-black/40 backdrop-blur-sm`, HANYA di-render jika `mobileOpen &&` (line 184).
- Backdrop `z-40`, sidebar `z-50`, header `z-40` → sidebar di atas header, backdrop sejajar header.
- Saat TERTUTUP: sidebar `-translate-x-full` (luar layar), backdrop tidak di-render → tidak ada yang menghalangi burger.

CHECKPOINT Burger: langkah 4 selesai

## Langkah 4 — fixed inset-0 / z- di seluruh komponen
| path:baris | class | cara disembunyikan |
|---|---|---|
| GlobalHeader.tsx:108 | `fixed top-0 right-0 z-40 ... left-0` | selalu mounted (kecuali halaman auth) |
| GlobalHeader.tsx:140 | `fixed inset-x-3 top-16 ... z-50` | conditional `notifOpen` |
| GlobalHeader.tsx:270 | `fixed inset-x-3 top-16 ... z-50` | conditional `settingsOpen` |
| GlobalHeader.tsx:346 | `fixed inset-0 z-50` | conditional `helpOpen` |
| CompactSidebar.tsx:186 | `fixed inset-0 z-40` | conditional `mobileOpen` |
| CompactSidebar.tsx:191 | `fixed left-0 top-0 z-50 ... md:hidden` | selalu di-mount di mobile, `-translate-x-full` saat tertutup |
| CompactSidebar.tsx:233 | `hidden md:flex fixed left-0 top-0 z-30` | `hidden md:flex` — tidak di-mount di mobile |

CHECKPOINT Burger: langkah 5 selesai

## Langkah 5 — git diff perubahan kita
Perubahan yang dilakukan (vs working tree):
1. CompactSidebar mobile sidebar: tambah `md:hidden` (line 191) — di mobile sidebar tetap tampil, tidak ada pengaruh pada burger.
2. GlobalHeader: ubah `style={{ left: ... }}` jadi CSS variable + class `left-0 md:left-[var(--sidebar-w)]` (line 108) — tidak memengaruhi tombol burger.
3. GlobalHeader notif/settings dropdown: ubah `absolute` jadi `fixed inset-x-3 top-16` di mobile — conditional, hanya muncul saat dibuka.

CHECKPOINT Burger: diagnosa selesai

CHECKPOINT Burger-fix: langkah 1 selesai
- Grep SidebarProvider/useSidebar: SATU provider di app/layout.tsx:36. Semua useSidebar di bawahnya. Tidak ada provider ganda. Tidak perlu perbaikan.

CHECKPOINT Burger-fix: langkah 2 selesai (DIAPLIKASIKAN)
- Penyebab: CompactSidebar.tsx:72-76 dependency array `[pathname, isMobile, mobileOpen, setMobileOpen]` menyebabkan useEffect berjalan saat mobileOpen berubah false→true (saat burger diklik). Karena isMobile && mobileOpen true, ia langsung setMobileOpen(false) → sidebar tertutup segera.
- Perbaikan: dependency jadi hanya `[pathname]`, hapus isMobile/mobileOpen/setMobileOpen. Sekarang sidebar hanya ditutup saat pathname berubah.
- tsc --noEmit: lolos tanpa error.

CHECKPOINT Burger-fix: langkah 3 selesai
- Stacking context: html `overflow-x-hidden` (app/layout.tsx:32), body tanpa transform. Dashboard layout div `overflow-visible` (dashboard/layout.tsx:41) tanpa transform/filter/backdrop-blur/will-change/contain/isolate. Sidebar mobile `fixed left-0 top-0 z-50 transform md:hidden` (CompactSidebar.tsx:191) — z-50 > header z-40, tidak ada konflik display/hidden. Tidak bermasalah, tidak perlu perbaikan.

CHECKPOINT Master-A: bagian 1 (header + pencarian) selesai
- page.tsx:2260-2276 header: `flex flex-col gap-3 md:flex-row md:items-center md:justify-between`, judul div `min-w-0`, h1 `text-2xl md:text-3xl`, deskripsi `line-clamp-2 md:line-clamp-none`, form `w-full md:w-80`.

CHECKPOINT Master-A: bagian 2 (tab) selesai
- page.tsx:2280 tab wrapper: `flex gap-2 overflow-x-auto overscroll-x-contain pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`, tombol tab `shrink-0 whitespace-nowrap min-h-10`.

CHECKPOINT Master-A: bagian 3 ( judul section + Tambah + filter) selesai
- page.tsx:2301 action row: `flex items-center justify-between gap-3`, tombol Tambah `shrink-0 min-h-10`.
- Filter wadah: `grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center`, tiap select `w-full sm:w-auto`. Personnel (3 filter, ganjil) → yang terakhir `col-span-2 sm:col-auto`. Semua tab lain (items, vehicles, projects, clusters, suppliers, warehouses) juga diubah ke pola yang sama.
- tsc --noEmit: lolos tanpa error.

## Master-data cards — diagnosa tabel
- Tabel tunggal: page.tsx:2477-2873, di-render dalam `data.map((record, index) => ...)` (page.tsx:2516). Tidak ada `cond && (...)` atau ternary yang menyembunyikan tabel; hanya conditional loading/error/empty.
- Pagination: komponen `Pagination` (page.tsx:413-467), dipanggil page.tsx:2861. Tidak ada infinite scroll / IntersectionObserver.
- Kolom per tab (array `columns` page.tsx:2023-2042):
  - items: kode_perangkat, nama barang, kategori, satuan_default, foto
  - projects: project_id, title, nama_project, kecamatan, desa_kelurahan, cluster_count, status_aktif
  - personnel: nama, email, nik, posisi, no_hp, gudang, bisa_menyetir, is_aktif, foto
  - vehicles: kendaraan_id, jenis_kendaraan, merk, no_polisi, gudang, foto
  - warehouses: nama_gudang, alamat, tipe, is_aktif
  - suppliers: kode, nama, deskripsi, is_aktif
  - clusters: nama_project, nama_cluster, cluster_id, cluster_type, alamat_lengkap, homepass_plan, status_aktif
- Aksi per baris (page.tsx:2680-2830): Eye (detail), Pencil (edit → setFormModal edit), Trash2 (delete → setDeleteRecord). Personnel khusus: disable hapus jika aktif. Suppliers/Projects/Clusters: Ban (nonaktifkan) + RotateCcw (aktifkan).

CHECKPOINT Master-B: langkah 1 selesai
- Move: components/staff/MobileCardList.tsx → components/MobileCardList.tsx (via Set-Content, file not under git control). Import di app/staff/inbound/page.tsx:13 diubah ke "@/components/MobileCardList". Tidak ada file lain yang memakai.

CHECKPOINT Master-B: langkah 2 selesai
- mobileItemsMaster ditambahkan tepat sebelum `return (` (page.tsx:2255). Switch case "items" dan "projects" terisi, default return []. Tab Barang: title=nama barang, badge=kategori, fields=[Satuan, Kode], image=foto, actions=Detail/Edit/Hapus (min-h-11, grid grid-cols-3 gap-2). Tab Project: title=nama project, badge=Status Aktif/Tidak Aktif, fields=[Kecamatan, Desa, Cluster], actions=Detail/Edit/Nonaktifkan/Aktifkan. MobileCardList.tsx:10-17 ditambahkan prop opsional `image?: string` dan render `<img>` 48x48 rounded (MobileCardList.tsx:34-36). Aksi menggunakan handler yang sama (setDetailRecord, setFormModal, setDeleteRecord, setProjectNonaktifRecord, setProjectAktifRecord). tsc --noEmit: lolos.

CHECKPOINT Master-B: langkah 3 selesai
- Edit 1 (class saja): page.tsx:2547 wrapper tabel diberi `${mobileItemsMaster.length > 0 ? "hidden md:block" : ""}`.
- Edit 2 (satu baris): page.tsx:2545 sisipkan `<MobileCardList items={mobileItemsMaster} />` sebagai sibling sebelum wrapper tabel. Import MobileCardList di page.tsx:12. Pagination (page.tsx:2861) dan state loading/empty tetap tampil sekali. Tidak ada id/htmlFor/ref duplikat.
- tsc --noEmit: lolos tanpa error.

CHECKPOINT Master-C: langkah 0 ( Barang ) selesai
- Tabel Barang menampilkan kolom Kategori (page.tsx:2026). Card Barang sudah menampilkan kategori sebagai badge (page.tsx:2268), jadi tidak perlu tambahan.

CHECKPOINT Master-C: tab Personil selesai
- case "personnel" di page.tsx:2321. title=nama, badge=Aktif/Tidak Aktif, fields=[Posisi, Email, Gudang], image=foto, actions=Detail/Edit/Hapus (disabled jika aktif, min-h-11). tsc lolos.

CHECKPOINT Master-C: tab Kendaraan selesai
- case "vehicles" di page.tsx:2350. title=no_polisi, badge=nama kategori (jenis_kendaraan), fields=[Merk, No Polisi, Gudang], image=foto, actions=Detail/Edit/Hapus (min-h-11). tsc lolos.

CHECKPOINT Master-C: tab Gudang selesai
- case "warehouses" di page.tsx:2379. title=nama_gudang, badge=Dadakan/Tetap, fields=[Kode, Lokasi, Status], actions=Detail/Edit/Hapus (min-h-11). tsc lolos.

CHECKPOINT Master-C: tab Supplier selesai
- case "suppliers" di page.tsx:2409. title=nama, badge=Aktif/Nonaktif, fields=[Kode, Kontak, Deskripsi], actions=Detail/Edit/Nonaktifkan(Aktifkan) (min-h-11). tsc lolos.

CHECKPOINT Master-C: tab Cluster selesai
- case "clusters" di page.tsx:2442. title=nama_cluster, badge=Aktif/Tidak Aktif, fields=[Project, Tipe, Homepass], actions=Detail/Edit/Nonaktifkan(Aktifkan) (min-h-11). tsc lolos.

CHECKPOINT Master-C: langkah 2 (sisa default) selesai
- default: return [] tetap ada (page.tsx:2473). Kondisi `hidden md:block` pada tabel (page.tsx:2550) bekerja untuk semua tab via `mobileItemsMaster.length > 0`. Saat data kosong, MobileCardList mengembalikan null (MobileCardList.tsx:24-26), tabel tampil tanpa class hidden → pesan kosong muncul tepat sekali. Tidak ada duplikat.
- tsc --noEmit: lolos tanpa error.

CHECKPOINT BOQ-A: bagian 1 (Header) selesai
- page.tsx:975 header: `flex flex-col gap-3 md:flex-row md:items-center md:justify-between`, judul `min-w-0`, h1 `text-2xl md:text-3xl`, deskripsi `line-clamp-2 md:line-clamp-none`, tombol wadah `flex flex-wrap items-center gap-2`, tiap tombol `whitespace-nowrap shrink-0 min-h-10`.

CHECKPOINT BOQ-A: bagian 2 (Kartu statistik) selesai
- page.tsx:1015 grid sudah `grid-cols-1 sm:grid-cols-3` dengan `p-4`, isi pendek (angka+label). Biarkan, tidak perlu ubahan.

CHECKPOINT BOQ-A: bagian 3 (Tab) selesai
- page.tsx:1034 wrapper tab: `flex gap-2 overflow-x-auto overscroll-x-contain pb-1 -mx-6 px-6 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`, tiap tab `shrink-0 whitespace-nowrap min-h-10`. Container halaman `p-6` (page.tsx:973), jadi margin negatif `-mx-6` sudah benar.

CHECKPOINT BOQ-A: bagian 4 (Pencarian + filter) selesai
- page.tsx:1063 wadah: `flex flex-col gap-2 md:flex-row md:items-center`, pencarian `flex-1`, dua dropdown dalam `grid grid-cols-2 gap-2 md:flex md:flex-wrap`, tiap select `w-full md:w-auto`.

## BOQ cards — diagnosa tabel
- Tabel utama: page.tsx:1170 (`boqs.map`), di-render dalam `loading ? (...) : error ? (...) : boqs.length === 0 ? (...) : boqs.map(...)`. Tidak ada `cond &&`/ternary yang menyembunyikan tabel.
- Array data: `boqs`. Kolom: nomor BOQ (`boqNumber`), sumber (`source`), project (`project?.projectName` + area), verifikasi (`externalVerificationStatus`), item qty (`items.length`), total qty, dokumen (`referenceFile` → PDF), cluster (`clusterId` + `cluster?.nama_cluster`), status (`status`), aksi.
- Isi kolom Dokumen: `referenceFile` truthy → tautan PDF "PDF", else "-".
- Isi kolom Cluster: `boq.clusterId || boq.cluster?.cluster_id` (nama_cluster di bawah bila ada).
- Aksi per baris: Eye → `openDetailModal(boq)` (klik baris juga memanggil `openDetailModal`), Pencil → `openEditModal(boq)`, RefreshCw → `handleRestoreBoq(boq)` (hanya status "ditolak"), CheckCircle2 → `handleActivate(boq)` (hanya tab draft, disabled bila belum verifikasi eksternal).
- Pagination: tidak ada (data di-load sekali, array `boqs`). Tabel sama untuk semua tab (Aktif/Draft/Selesai/Ditolak), filter by `activeTab`.
- tsc --noEmit: nol error dari edit kita. Satu error pre-existing di page.tsx:2076 (duplikat properti `nama_project`) tidak berhubungan dengan perubahan ini.

CHECKPOINT BOQ-B: langkah 0 (MobileCardList) selesai
- components/MobileCardList.tsx ada dan UTF-8 valid (OK). Tidak perlu ditulis ulang.

CHECKPOINT BOQ-B: langkah 1 (mobileItemsBoq) selesai
- Import MobileCardList di app/dashboard/boq/page.tsx:6. `mobileItemsBoq = boqs.map(...)` ditambahkan tepat sebelum `return (` (page.tsx:971). key=String(boq.id), title=boqNumber, badge=Status (badge class sama dengan tabel), fields=[Project, Sumber, Item (barang/qty), Verifikasi, Cluster], actions=Detail(openDetailModal)/Edit(openEditModal)/Restore(handleRestoreBoq, hanya ditolak)/Aktifkan(handleActivate, hanya draft, disabled bila belum verifikasi). Dokumen (PDF) TIDAK dimasukkan (dilaporkan). tsc lolos.

CHECKPOINT BOQ-B: langkah 2 (Pasang) selesai
- Edit 1 (class saja): page.tsx:1147 wrapper tabel diberi `${!loading && !error && mobileItemsBoq.length > 0 ? "hidden md:block" : ""}`.
- Edit 2 (satu baris): page.tsx:1146 sisipkan `<MobileCardList items={mobileItemsBoq} />` sebagai sibling sebelum wrapper tabel. Saat loading/error/kosong, class hidden tidak dipasang → tabel dengan pesan tetap tampil sekali di mobile. Tidak ada id/htmlFor/ref duplikat.
- tsc --noEmit: lolos tanpa error.

CHECKPOINT BOQ-B: langkah 3 (Verifikasi encoding) selesai
- UTF-8 check: OK app/dashboard/boq/page.tsx, OK components/MobileCardList.tsx, OK app/master-data/page.tsx.

CHECKPOINT Delivery: bagian 1 (Tab) selesai
- page.tsx:342 wrapper tab: `flex w-full max-w-full md:w-auto flex-nowrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`, tiap tab tetap `shrink-0 whitespace-nowrap min-h-10`.

CHECKPOINT Delivery: bagian 2 (Pencarian + filter) selesai
- page.tsx:341 baris tab+pencarian: `flex flex-col gap-3 md:flex-row md:items-center`, pencarian `flex-1`. page.tsx:371 wadah filter: `grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center`, select gudang/status `w-full md:w-auto`. Dua input tanggal dalam `col-span-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:col-span-1 md:flex md:w-auto`, tiap input `w-full min-w-0`.

CHECKPOINT Delivery: bagian 3 (Tabel ringkas) selesai
- page.tsx:436 `<table className="w-full md:min-w-[1000px]">`. Kolom disembunyikan di mobile (`hidden md:table-cell`): Tipe, Project, Tanggal. Di sel No. Surat Jalan tambahkan `<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 md:hidden">` berisi badge tipe, nama project, tanggal. Nomor surat jalan `break-all`. Padding sel `px-3 py-3 md:px-6 md:py-4`. Ikon aksi `min-h-10 min-w-10 inline-flex items-center justify-center`. colSpan loading/error/kosong tetap 6. Klik baris `setSelectedRecord` dan stopPropagation tetap ada. Kolom yang tampil di mobile: No. Surat Jalan, Status, Aksi.
- tsc --noEmit: lolos tanpa error.

CHECKPOINT Delivery-2: bagian 1 (Tab flex-nowrap) selesai
- page.tsx:342 `flex-wrap` → `flex-nowrap`, tambah `max-w-full`. Tiap tab tetap `shrink-0 whitespace-nowrap`.

CHECKPOINT Delivery-2: bagian 2 (Tabel 2 kolom mobile) selesai
- page.tsx:439-444 header: `px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-xs whitespace-nowrap`, kolom Status tambah `hidden md:table-cell`.
- page.tsx:481-538 baris: kolom Status disembunyikan (`hidden md:table-cell`), sel No. Surat Jalan `w-full break-words` + `text-sm md:text-base font-medium`, badge tipe di elemen kecil `whitespace-nowrap shrink-0`, tambah badge Status di baris pertama elemen kecil. Padding `px-2 py-3 md:px-6 md:py-4`, kolom Aksi `w-12 md:w-auto px-1 md:px-6`.
- Kolom yang tampil di mobile: No. Surat Jalan, Aksi (Status dan Tipe disembunyikan, muncul di elemen kecil No. Surat Jalan).
- tsc --noEmit: lolos tanpa error.

CHECKPOINT Delivery-2: bagian 3 (Padding halaman) selesai
- Container halaman `p-6` (page.tsx:331), wrapper tabel `rounded-2xl border` (page.tsx:434) tidak punya padding horizontal di mobile. Tidak perlu ubahan.
- tsc --noEmit: lolos tanpa error. UTF-8: OK.

CHECKPOINT Pagination-1: langkah 1 (Komponen bersama) selesai
- components/TablePagination.tsx: file baru (Write), props page/pageSize/total/onPageChange. return null bila total <= pageSize. Info "Menampilkan X-Y dari Z data" text-xs md:text-sm. Tombol Sebelumnya/…/Selanjutnya min-h-10 min-w-10, halaman aktif bg-orange-500 text-white, disabled opacity-50 cursor-not-allowed, aria-current. Tanpa dependensi baru. tsc lolos.

CHECKPOINT Pagination-1: langkah 2 (Pasang di delivery) selesai
- app/dashboard/delivery/page.tsx:12 import TablePagination. page.tsx:119 const [page, setPage] = useState(1). page.tsx:121 const PAGE_SIZE = 25. page.tsx:333-335 totalPages/safePage/pagedRecords. page.tsx:483 filteredRecords.map → pagedRecords.map. page.tsx:337 useEffect setPage(1) pada [activeTab, searchQuery, gudangFilter, statusFilter, startDate, endDate]. page.tsx:558 <TablePagination ... /> sesudah wrapper tabel, onPageChange memanggil setPage + window.scrollTo top 400 smooth. Saat loading/error/kosong pagination tidak tampil (total 0 → null). tsc lolos.

CHECKPOINT Pagination-1: langkah 3 (Inventaris tabel lain) selesai
- app/dashboard/delivery/page.tsx:474 filteredRecords.map — pagination baru dipasang (ya).
- app/dashboard/boq/page.tsx:1170 boqs.map — pagination tidak ada (data di-load sekali), kandidat berikutnya.
- app/master-data/page.tsx:2516 data.map — sudah punya komponen Pagination di page.tsx:413, jangan diganti.
- app/dashboard/reconciliation/page.tsx:845 filteredRecords — pagination tidak ada (ada history pagination di 1676-1687, bukan tabel utama), data dari API sekali, sedang-banyak.
- app/staff/outbound/page.tsx:157/220 filtered — pagination tidak ada, API sekali, sedang-banyak.
- app/staff/inbound/page.tsx:1190 list — pagination tidak ada, API sekali, sedang-banyak.
- app/dashboard/supervisor/operasional/page.tsx:677/789/847 filteredPersonnels/filteredVehicles/filteredItems — pagination tidak ada, API sekali, sedang.
- tsc --noEmit: lolos tanpa error. UTF-8: OK TablePagination, OK delivery/page.tsx, OK boq/page.tsx.

## Pagination kandidat (tanpa edit) — versi lengkap
| path:baris | array di-map | sudah ada pagination? | asal data | perkiraan jumlah |
|---|---|---|---|---|
| app/dashboard/delivery/page.tsx:483 | pagedRecords (dari filteredRecords) | ya (baru) | API sekali | sedang-banyak |
| app/dashboard/boq/page.tsx:1182 | pagedBoqs (dari boqs) | ya (baru) | API sekali | sedang-banyak |
| app/master-data/page.tsx:2516 | data | ya (Pagination, page.tsx:413) | API paginasi | sedang-banyak |
| app/dashboard/reconciliation/page.tsx:845 | filteredRecords | tidak (history pagination di 1676-1687, bukan tabel utama) | API sekali | sedang-banyak |
| app/dashboard/supervisor/operasional/page.tsx:677/789/847 | filteredPersonnels/filteredVehicles/filteredItems | tidak | API sekali | sedang |
| app/staff/outbound/page.tsx:157/220 | filtered | tidak | API sekali | sedang-banyak |
| app/staff/inbound/page.tsx:1190 | list | tidak | API sekali | sedang-banyak |