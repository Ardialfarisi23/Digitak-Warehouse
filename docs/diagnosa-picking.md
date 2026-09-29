# Diagnosa Alur Retrieve/Picking Barang Gudang Per Zona

## 1. Stack & Struktur Ringkas
- **Backend**: Node.js + Express (CJS) di `backend/src/server.js`
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript di `frontend/app/`
- **Database**: PostgreSQL melalui Prisma ORM (`backend/prisma/schema.prisma`)
- **Auth**: JWT + role-based (`authenticate`, `authorize`)
- **Struktur folder utama**:
  - `backend/src/modules/surat-jalan/` — SJ, picking/retrieve, distribusi
  - `backend/src/modules/warehouse/` — stok, zona, picking-stock-check
  - `backend/src/modules/reconciliation/` — rekonsiliasi per project
  - `frontend/app/staff/outbound/[suratJalanId]/picking/` — UI picking staff
  - `frontend/app/staff/dashboard/page.tsx` — task queue SJ outbound

## 2. Daftar File Relevan
| Path | Peran | Fungsi singkat |
|---|---|---|
| `backend/src/modules/surat-jalan/surat-jalan.routes.js:117-123` | Route | POST `/api/surat-jalan/:id/retrieve` untuk STAFF/SPV |
| `backend/src/modules/surat-jalan/surat-jalan.controller.js:196-203` | Controller | Panggil `suratJalanService.retrieve()` |
| `backend/src/modules/surat-jalan/surat-jalan.service.js:1168-1391` | Service | Logika retrieve/picking: validasi stok, override, kurangi stok, buat `surat_jalan_item_pick`, notifikasi |
| `backend/src/modules/surat-jalan/surat-jalan.service.js:78-160` | Service | `buildPickDecision()` dan `mapPickRow()` — menentukan override dan hasil validasi |
| `backend/src/modules/surat-jalan/surat-jalan.validation.js:183-195` | Validation | Schema Zod untuk `retrieveSchema` (`item_id`, `zona_id`, `qty`, `kondisi`, `catatan_kondisi`) |
| `backend/src/modules/warehouse/warehouse.routes.js:38-39` | Route | GET `/:gudang_id/picking-stock-check` dan `picking-availability` |
| `backend/src/modules/warehouse/warehouse.controller.js:92-114` | Controller | Panggil service picking-stock-check/availability |
| `backend/src/modules/warehouse/warehouse.service.js:536-576` | Service | `getPickingStockCheck` dan `getPickingAvailability` — snapshot stok per barang/zona/kondisi |
| `backend/src/modules/warehouse/warehouse.repository.js:184-321` | Repository | Query `stok_gudang` untuk `getPickingStockAvailability` dan `getPickingAvailability` |
| `backend/src/modules/reconciliation/reconciliation.repository.js:76-132` | Repository | Agregasi `surat_jalan_item_pick` + `stok_gudang` untuk rekonsiliasi |
| `backend/src/modules/reconciliation/reconciliation.utils.js:6-80` | Utils | `buildPickSummary()` — ringkas pick per kondisi + override total |
| `backend/prisma/schema.prisma:514-550` | Model | `surat_jalan_item_pick` dan `stok_gudang` — unik kombinasinya |
| `frontend/app/staff/outbound/[suratJalanId]/picking/page.tsx` | UI | Halaman picking staff: pilih zona, kondisi, alasan override, submit retrieve |
| `frontend/app/staff/dashboard/page.tsx` | UI | Task queue outbound "Picking Barang" |

## 3. Model Data
### Entitas Utama
**`surat_jalan`** (`schema.prisma:421-469`)
- Kolom penting: `surat_jalan_id`, `tipe` (`inbound`/`outbound`), `status` (`draft_diajukan`, `disetujui`, `sedang_dikirim`, `diterima_didistribusikan`, dst), `gudang_asal_id`, `gudang_tujuan_id`, `picking_selesai` (boolean), `project_id`, `tujuan_tipe`
- Relasi: `items` → `surat_jalan_item[]`

**`surat_jalan_item`** (`schema.prisma:471-499`)
- Kolom penting: `item_id`, `surat_jalan_id`, `barang_id`, `qty`, `kondisi` (`kondisi_barang`), `zona_id`, `is_kelebihan`, `is_di_luar_boq`
- Relasi: `picks` → `surat_jalan_item_pick[]`

**`surat_jalan_item_pick`** (`schema.prisma:514-530`)
- Kolom penting: `pick_id`, `surat_jalan_item_id`, `gudang_id`, `zona_id`, `kondisi_diminta`, `kondisi_diambil`, `qty`, `is_override` (boolean), `catatan_override`, `picked_by`, `picked_at`
- Relasi:many-to-one ke `surat_jalan_item`

**`stok_gudang`** (`schema.prisma:532-550`)
- Kolom penting: `stok_id`, `gudang_id`, `zona_id`, `barang_id`, `project_id`, `kondisi` (`kondisi_barang`), `qty`
- Unique constraint: `@@unique([gudang_id, zona_id, barang_id, project_id, kondisi])`
- Relasi: ke `gudang`, `zona_gudang`, `barang`, `project`

**`stok_ledger`** (`schema.prisma:552-568`)
- Kolom penting: `ledger_id`, `surat_jalan_item_id`, `return_transaction_id`, `barang_id`, `jenis_mutasi` (`in`/`out`), `qty`, `saldo_setelah`, `waktu_mutasi`

**`zona_gudang`** (`schema.prisma:234-250`)
- Kolom penting: `zona_id`, `gudang_id`, `kode_zona`, `nama_zona`, `tipe_zona`, `status_kecukupan`

### Apakah stok disimpan per kombinasi (barang, gudang, zona, kondisi)?
**Ya.** Bukti: `schema.prisma:546` — `@@unique([gudang_id, zona_id, barang_id, project_id, kondisi])`. Setiap kombinasi tersebut adalah satu baris `stok_gudang` dengan kolom `qty` tersendiri.

## 4. Alur Picking Saat Ini (End-to-End)
1. **Verifikasi SJ / Task Queue**
   - UI: `frontend/app/staff/dashboard/page.tsx:305-320` memanggil `GET /api/surat-jalan/outbound/queue?gudangTujuanId=...&status=disetujui`
   - Backend: `suratJalanService.findOutboundQueue()` mengembalikan SJ outbound berstatus `disetujui`

2. **Buka Halaman Picking**
   - UI: `frontend/app/staff/outbound/[suratJalanId]/picking/page.tsx:270-312` memuat detail SJ dan daftar zona (`/api/zones`)
   - UI: `page.tsx:319-329` memanggil `GET /api/warehouses/:gudang_id/picking-stock-check` dan `picking-availability` untuk mendapatkan snapshot stok per kondisi

3. **Pemilihan Zona & Kondisi**
   - UI: `page.tsx:739-776` menampilkan zona pengambilan. Jika stok kondisi sesuai kosong, menampilkan stok kondisi lain yang tersedia (`alternatives`).
   - UI: `page.tsx:445-464` — `allAssigned` mengecek: jika `availability.status === "override_available"`, maka `isOverride` dan `catatan?.trim()` harus ada sebelum submit diizinkan.

4. **Validasi Stok (Backend)**
   - Route: `POST /api/surat-jalan/:id/retrieve` (`surat-jalan.routes.js:117-123`)
   - Controller: `suratJalanController.retrieve()` (`surat-jalan.controller.js:196-203`)
   - Service: `suratJalanService.retrieve()` (`surat-jalan.service.js:1168-1391`)
   - Query stok awal (`surat-jalan.service.js:1208-1217`):
     ```javascript
     const stock = await tx.stok_gudang.findFirst({
       where: {
         gudang_id: gudangAsalId,
         barang_id: barangId,
         zona_id: zonaId,
         kondisi: pickedKondisi || requestedKondisi,
         project_id: shipment.project_id,
       },
       orderBy: { qty: "desc" },
     });
     ```
   - Jika `stock` tidak ketemu, query fallback (`surat-jalan.service.js:1222-1233`) mengambil semua stok di zona tersebut untuk menampilkan ringkasan kondisi lain.

5. **Override Decision**
   - `buildPickDecision()` (`surat-jalan.service.js:78-135`):
     - `isOverride = pickedKondisi && pickedKondisi !== requestedKondisi`
     - Jika `isOverride && !catatanKondisi?.trim()` → tolak (`OVERRIDE_REASON_REQUIRED`)
     - Jika `!stock && isOverride` → tolak (`OVERRIDE_NO_STOCK`)
     - Jika `!stock && !isOverride` → tolak (`NO_STOCK`) + tampilkan fallback
     - Jika `stock.qty < qty` → tolak (`INSUFFICIENT_STOCK`)

6. **Commit Picking & Pengurangan Stok**
   - Jika `decision.ok === true`, lanjut ke `updateMany` (`surat-jalan.service.js:1264-1273`) decrement qty di `stok_gudang`.
   - Jika qty baru <= 0, delete row stok (`surat-jalan.service.js:1288-1292`).
   - Buat `stok_ledger` jenis `out` (`surat-jalan.service.js:1294-1306`).
   - Buat `surat_jalan_item_pick` via `mapPickRow()` (`surat-jalan.service.js:1304-1315`).
   - Recalc kapasitas zona (`surat-jalan.service.js:1338`).

## 5. Akar Masalah Override
a) **Titik penolakan saat kondisi tidak sesuai**:
   - `surat-jalan.service.js:1208-1217` — query stok filter `kondisi: pickedKondisi || requestedKondisi`. Jika staff memilih kondisi berbeda yang tidak ada stoknya, `stock` bernilai `null`.
   - `surat-jalan.service.js:102-109` — jika `!stock && isOverride`, sistem mengembalikan `OVERRIDE_NO_STOCK` dan memanggil `throw new AppError(...)` di `surat-jalan.service.js:1257-1259`, menggagalkan picking.

b) **Filter query stok terlalu ketat**:
   - Ya. Di `retrieve()`, query harus exact match `gudang_id`, `barang_id`, `zona_id`, `project_id`, dan `kondisi`. Tidak ada fallback otomatis ke kondisi lain jika stok kondisi diminta kosong. Fallback hanya digunakan untuk menampilkan pesan, bukan untuk melanjutkan picking.

c) **Mekanisme override sekarang**:
   - **UI**: `frontend/app/staff/outbound/[suratJalanId]/picking/page.tsx:858` dan `:945` menampilkan input `Alasan override *`. Jika `availability.status === "override_available"`, UI menampilkan alternatif kondisi lain yang tersedia.
   - **Permission**: Override tidak memerlukan role khusus; STAFF dan SUPERVISOR dapat melakukan retrieve (`surat-jalan.routes.js:120`).
   - **Endpoint**: sama `POST /api/surat-jalan/:id/retrieve`.
   - **Data yang diubah**: `surat_jalan_item_pick` dibuat dengan `is_override: true`, `kondisi_diminta` vs `kondisi_diambil` berbeda, `catatan_override` diisi. Stok dikurangi dari kondisi yang **diambil**, bukan kondisi yang diminta.

d) **Mengapa override harus dilakukan SEBELUM data barang sesuai bisa diambil**:
   - Karena `buildPickDecision()` memaksa `isOverride` ditandai secara eksplisit dan memverifikasi `catatanKondisi` **sebelum** transaksi picking dilanjutkan (`surat-jalan.service.js:91-97`).
   - Jika staff memilih kondisi berbeda, `pickedKondisi !== requestedKondisi` → `isOverride = true`. Tanpa alasan override, `decision.ok = false` dan picking langsung dihentikan. Artinya, sistem tidak mengizinkan picking kondisi berbeda sebagai "pencarian otomatis", melainkan sebagai "pengecualian yang harus didokumentasikan terlebih dahulu".

e) **Race condition, stok negatif, atau pengurangan ganda/tidak terjadi?**
   - **Race condition**: Transaksi picking dibungkus `prisma.$transaction()` dengan `updateMany` + syarat `qty: { gte: deductQty }` (`surat-jalan.service.js:1264-1273`). Ini manto verifikasi stok dan kurangi secara atomik.
   - **Stok negatif**: Tidak terjadi karena ada pengecekan `updated.count !== 1` → throw `INSUFFICIENT_STOCK` (`surat-jalan.service.js:1275-1281`). Namun, jika dua request concurrent untuk stok yang sama, `updateMany` dengan `gte` bisa mengembalikan `count: 0` untuk yang kedua, sehingga aman.
   - **Pengurangan ganda**: Tidak ada mekanisme idempoten di level tabel `surat_jalan_item_pick` (tidak ada unique constraint selain `pick_id`). Jika UI melakukan double submit, dua baris pick bisa dibuat. Di repository, `claimPicking()` (`surat-jalan.repository.js:1188-1192`) hanya mengecek `picking_selesai === false` sebelum transaksi, tapi tidak melock item SJ secara baris.
   - **Stok tidak berkurang**: Tidak teridentifikasi dalam alur normal; dalam transaksi, decrement dan ledger dibuat sebelum commit.

f) **Apakah item SJ menyimpan kondisi asli vs kondisi aktual yang diambil?**
   - **Ya.** `surat_jalan_item.kondisi` menyimpan kondisi **asli/diminta** dari SJ. `surat_jalan_item_pick.kondisi_diminta` dan `kondisi_diambil` mencatat perbedaan saat picking. Bukti: `schema.prisma:477` (`kondisi` pada item) vs `schema.prisma:519-520` (`kondisi_diminta`, `kondisi_diambil` pada pick).

## 6. Gap Alur Distribusi / Rekonsiliasi
- **Status enum SJ**: `draft_diajukan`, `menunggu_verifikasi`, `ready_putaway`, `disetujui`, `digenerate`, `diterima_didistribusikan` (`schema.prisma:773-782`).
- **Transisi distribusi**: `updateDeliveryStatus()` (`surat-jalan.service.js:1393-1490`) mengizinkan transisi hanya dari `disetujui` atau `sedang_dikirim` ke `sedang_dikirim` atau `diterima_didistribusikan`. Transisi ini divalidasi.
- **Gate picking sebelum distribusi**: `surat-jalan.service.js:1409-1411` memaksa `picking_selesai === true` sebelum bisa mengubah status distribusi.
- **Pembawa data override ke rekonsiliasi**: `reconciliation.repository.js:109-132` melakukan `groupBy` pada `surat_jalan_item_pick` by `surat_jalan_item_id`, `kondisi_diambil`, `is_override`. Data override terbawa ke rekonsiliasi.
- **Gap yang terlihat**:
  1. Tidak ada status eksplisit "Dalam Perjalanan" terpisah dari `sedang_dikirim`. Artinya `sedang_dikirim` sudah mewakili "Dalam Perjalanan", tapi tidak ada state "Distribusi Selesai" selain `diterima_didistribusikan`. Alur "Laporan barang sampai → SPV konfirmasi → Rekonsiliasi" tampaknya terjadi di luar modul SJ (mungkin di modul `reconciliation` atau `laporan_mitra`), dan tidak ada transisi status yang jelas dari `diterima_didistribusikan` ke "rekonsiliasi selesai" di dalam `surat_jalan`.
  2. Tidak ada validasi transisi lanjutan setelah `diterima_didistribusikan` untuk memicu rekonsiliasi. Proses rekonsiliasi tampaknya berdiri sendiri (`reconciliation` module) tanpa bergantung pada perubahan status SJ.

## 7. Risiko & Test Existing
### Test yang ada
- `backend/src/modules/surat-jalan/surat-jalan.service.test.js` — test `buildPickDecision` (override dengan/ tanpa alasan, qty tidak cukup, no stock) dan `mapPickRow`.
- `backend/src/modules/reconciliation/reconciliation.utils.test.js` — test `buildPickSummary()` untuk hitung `qty_override_total` dan `pick_breakdown`.

### Area berisiko jika diubah
1. **`surat-jalan.service.js:retrieve()`** — inti transaksi picking; perubahan bisa mempengaruhi stok, ledger, notifikasi, dan kapasitas zona.
2. **`warehouse.repository.js:getPickingAvailability()`** — logika UI `override_available` bergantung pada status ini; perubahan bisa memecah UX picking.
3. **`stok_gudang` unique constraint** — skema saat ini tight pada 5 kolom. Jika alur diubah agar bisa fallback otomatis ke kondisi lain, perlu pertimbangkan apakah masih ingin mempertahankan override eksplisit.
4. **Dependensi lintas modul**: `reconciliation` membaca `surat_jalan_item_pick`. Perubahan schema atau logika pick harus disinkronkan dengan repo rekonsiliasi.

## 8. Bagian BELUM DIPERIKSA
- **Frontend logic detail zona selection**: Algoritma `getValidZonesForItem` dan interaksi dengan `availabilityByItem` di `picking/page.tsx` sudah dilihat sebagian, tetapi efek samping ketika staff mengganti zona setelah memilih kondisi belum di-trace sepenuhnya.
- **Perilaku `claimPicking()`**: Implementasi di `surat-jalan.repository.js` belum dibaca; hanya tahu itu mengembalikan boolean.
- **Integrasi dengan modul `return`**: Apakah retur barang mempengaruhi stok yang dipilih override? Belum dicek.
- **Laporan mitra / in_transit**: Detail alur "Laporan barang sampai → SPV konfirmasi" di modul lain belum dieksplorasi.

## 9. Usulan Arah Perbaikan (maks 10 poin, tanpa kode)
1. Ubah alur override dari "eksplisit sebelum picking" menjadi "picking berjalan, override ditandai otomatis jika kondisi berbeda". Artinya, staff bisa langsung submit picking untuk kondisi tersedia, dan sistem mencatat `is_override` tanpa memaksa input alasan terlebih dahulu.
2. Jika alasan override tetap diperlukan untuk audit, pisahkan menjadi dua langkah: (a) submit picking, (b) konfirmasi override dengan alasan, agar picking tidak terblokir.
3. Perjelas UI `picking/page.tsx` agar ketika stok kondisi diminta kosong, staff bisa langsung memilih salah satu kondisi alternatif yang tersedia tanpa harus mengetik alasan terlebih dahulu.
4. Pertimbangkan auto-selection zona/kondisi berdasarkan stok terbesar jika staff tidak memilih zona, terutama untuk gudang dadakan dengan satu zona.
5. Tambahkan unique constraint atau idempoten key pada `surat_jalan_item_pick` (misal kombinasi `surat_jalan_item_id + zona_id + kondisi_diambil + picked_by + picked_at` rounded) untuk mencegah double submit.
6. Konsolidasikan status distribusi: gunakan enum yang lebih eksplisit (misal `menunggu_picking`, `sudah_dipick`, `sedang_dikirim`, `diterima`, `rekonsiliasi`) agar state machine lebih jelas.
7. Tambahkan transisi atau event dari `diterima_didistribusikan` ke proses rekonsiliasi, agar tidak bergantung pada workflow manual di luar sistem.
8. Perbaiki `buildPickDecision` agar jika `pickedKondisi` tidak ada stok, sistem bisaFallback ke kondisi lain yang ada stoknya (dengan tetap menandai override), daripada langsung menolak.
9. Tambahkan test integrasi untuk seluruh alur retrieve dengan override, termasuk verifikasi stok berkurang di kombinasi yang benar.
10. Dokumentasikan business rule override di kode (komentar pada `buildPickDecision`) agar konsisten antara bisnis yang diinginkan dan implementasi.
