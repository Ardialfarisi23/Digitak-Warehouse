# Fix BUG-06: Penyelarasan MOS Mitra & Definisi MOS Sistem (K5)

Modul Rekonsiliasi Supervisor (Task 3).

## Ringkasan masalah

Definisi MOS (Material On Site) belum final & tidak seragam:

1. **Tabel rekonsiliasi** menghitung MOS = inbound vendor eksternal + saldo awal import.
2. **`laporan_mitra` / `reconciliation_upload_detail`** menyimpan `mos = 0` (hardcode),
   sehingga **angka MOS pada riwayat laporan mitra berbeda** dari MOS pada ringkasan
   rekonsiliasi.
3. **`reports.repository.getHardwareReconciliation`** (project level) memakai definisi
   lama berbasis outbound ke lapangan.
4. **`reports.repository.getHardwareReconciliationPerTiket`** & **`boq.repository.getExportMatrixData`**
   memakai status inbound `ready_putaway`, sedangkan tabel rekonsiliasi tidak →
   angka MOS berbeda antar halaman untuk data yang sama.
5. **`reports.repository.backfillReconciliation`** menukar `mos` & `used`
   (mos = outbound, used = inbound).
6. **Frontend** membaca MOS dari 3 field berbeda (`mos` / `hardware_on_site` / `qty_on_site`)
   → ada risiko dua angka MOS berbeda pada tabel yang sama.
7. **Riwayat Input Laporan Mitra** (tab supervisor) memanggil endpoint yang tidak ada
   (`/api/reports/reconciliation/history` → 404) dan role SUPERVISOR tidak diizinkan
   mengakses `/api/reports/reconciliation-upload-logs`.
8. Dropdown **Status** tidak pernah diterapkan (tidak dikirim ke API & tidak difilter client).

## Definisi final MOS Sistem (K5)

```
MOS Sistem (K5) = inbound vendor eksternal (status: disetujui / diterima_didistribusikan)
                   + saldo awal (import BOQ `boq_item.qty_mos`)
Used            = input laporan mitra (upload Excel / input manual) — BUKAN bagian MOS
Remains         = MOS − (BOQ Plan + Additional)
```

Tidak termasuk: transfer internal antar gudang, inbound yang belum disetujui/diterima
(`ready_putaway`, verifikasi, dalam perjalanan), dan outbound ke lapangan.

## File + baris diubah

### Backend

1. `backend/src/modules/reconciliation/reconciliation.utils.js`
   - Tambah konstanta `MOS_INBOUND_STATUSES` & `MOS_SISTEM_DEFINITION` (acuan tunggal).
   - Tambah `roundQty()` & `computeMosSistem(inbound, saldoAwal)` (satu-satunya tempat rumus MOS).
   - `isMosEligibleInbound()` → memakai `MOS_INBOUND_STATUSES` (buang `ready_putaway`).
   - Tambah `pickLatestPerKey()` (semantik snapshot laporan mitra).
2. `backend/src/modules/reconciliation/reconciliation.repository.js`
   - Mode cluster & project memakai `computeMosSistem()`.
3. `backend/src/modules/reconciliation/reconciliation.service.js`
   - `refreshTiketMosUsed()`: MOS memakai snapshot **terakhir** per (tiket, barang)
     (anti penghitungan ganda), `used` tetap penjumlahan (perilaku lama).
   - Tambah `getRekonsiliasiMetricsByCluster()` — mengambil MOS/Remains langsung dari
     tabel rekonsiliasi (sumber data tunggal).
4. `backend/src/modules/reports/reports.controller.js`
   - `confirmReconciliationUpload()`: menghitung metrik rekonsiliasi sebelum transaksi,
     lalu menyimpan **MOS kanonik** ke `laporan_mitra.mos`,
     `reconciliation_upload_detail.mos` dan `remains_lapangan` (sebelumnya 0).
   - `downloadReconciliationTemplate()`: tambah sheet **"Petunjuk"** (MOS dihitung sistem).
5. `backend/src/modules/reports/reports.repository.js`
   - `getHardwareReconciliation()`: MOS memakai definisi kanonik + saldo awal;
     `used` memakai laporan mitra (fallback outbound).
   - `getHardwareReconciliationPerTiket()`: MOS memakai definisi kanonik + saldo awal.
   - `backfillReconciliation()`: `mos` = MOS kanonik, `used` = 0 (bukan proxy surat jalan).
6. `backend/src/modules/boq/boq.repository.js`
   - `getExportMatrixData()`: MOS memakai `computeMosSistem()` + saldo awal import.
7. `backend/src/modules/reports/reports.routes.js`
   - `/reconciliation-upload-logs` boleh diakses role `ADMIN` **dan** `SUPERVISOR`.

### Frontend

8. `frontend/app/dashboard/supervisor/reconciliation/page.tsx`
   - MOS hanya dari `item.mos` (hapus fallback `hardware_on_site` / `qty_on_site`).
   - Endpoint riwayat → `/api/reports/reconciliation-upload-logs` + parsing `{ data: { data: [] } }`.
   - Filter Status dikirim ke API & difilter client-side.
   - Teks KPI & "Catatan & Rumus" memakai definisi MOS/Remains final.
9. `frontend/app/dashboard/reconciliation/page.tsx`
   - MOS hanya dari `item.mos` (hapus fallback legacy).

### Test

10. `backend/src/modules/reconciliation/reconciliation.utils.test.js`
    - Update ekspektasi `isMosEligibleInbound` ke definisi final.
    - Tambah skenario **BB-REK-07 / BB-REK-08 / BB-REK-09**.
11. `backend/src/modules/reconciliation/reconciliation.repository.test.js`
    - Mock inbound memakai status `disetujui`; tambah kasus `ready_putaway` (tidak dihitung)
      dan `diterima_didistribusikan` (dihitung).

## Hasil test

- `npm test` (backend): **187 test lulus, 0 gagal** (termasuk 39 test modul rekonsiliasi).
- `npx tsc --noEmit` (frontend): tidak ada error pada file yang diubah
  (error yang tersisa berasal dari artefak `.next/types/validator.ts` yang sudah usang).

## Cara tes ulang — BB-REK-07 / BB-REK-08 / BB-REK-09

### BB-REK-07 — MOS tabel rekonsiliasi = MOS riwayat laporan mitra

1. Buka `/dashboard/supervisor/reconciliation`, pilih **Project** + **Cluster** yang punya
   inbound vendor eksternal status `disetujui`/`diterima_didistribusikan`.
2. Catat angka **MOS** pada tabel rekonsiliasi (mis. 12) dan angka **Sisa Lapangan**.
3. Upload laporan mitra (Excel template atau form input) untuk tiket & barang yang sama
   dengan `Angka Used` terisi.
4. Buka tab **Riwayat Input Laporan Mitra** → detail upload.
5. **Harapan**: angka MOS pada riwayat = angka MOS pada tabel rekonsiliasi (tanpa selisih);
   tidak ada lagi kolom MOS ganda.

### BB-REK-08 — MOS tidak terhitung ganda saat upload berulang

1. Dari cluster yang sama, upload laporan mitra **dua kali** untuk (tiket, barang) yang sama.
2. **Harapan**: `tiket_material.mos` tetap sama dengan MOS sistem (tidak 2×),
   dan tabel rekonsiliasi tidak berubah.

### BB-REK-09 — Definisi MOS Sistem final & konsisten antar halaman

1. Pastikan ada inbound `ready_putaway` / `menunggu_verifikasi` / transfer internal
   dan outbound ke lapangan untuk project yang sama.
2. **Harapan**:
   - Tabel rekonsiliasi supervisor, ringkasan dashboard supervisor, dan export matrix BOQ
     menampilkan **angka MOS yang sama** untuk (cluster, barang) yang sama.
   - `ready_putaway`, verifikasi, transfer internal, dan outbound **tidak** menambah MOS.
   - Kolom "Sisa Lapangan" = MOS − (BOQ Plan + Additional).
   - Dropdown **Status** benar-benar menyaring tabel & KPI.
