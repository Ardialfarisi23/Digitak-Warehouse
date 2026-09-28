# Diagnosa Alur Picking/Retrieve Gudang

**Tanggal:** 2026-09-28  
**Mode:** READ-ONLY — tidak ada kode yang diubah

---

## A. Peta Alur

**Tech Stack & DB:** Node.js/Express + Prisma ORM + PostgreSQL; Next.js frontend.

### File Inti

| File | Peran |
|------|-------|
| `backend/src/modules/surat-jalan/surat-jalan.routes.js:117-123` | Route `POST /:id/retrieve` (picking) |
| `backend/src/modules/surat-jalan/surat-jalan.controller.js:196-203` | Controller retrieve |
| `backend/src/modules/surat-jalan/surat-jalan.service.js:1084-1287` | **Logic inti picking/retrieve** |
| `backend/src/modules/surat-jalan/surat-jalan.validation.js:183-195` | Schema validate retrieve |
| `backend/src/modules/surat-jalan/surat-jalan.repository.js:476-503` | Update status SJ + picking_selesai |
| `backend/src/modules/warehouse/warehouse.service.js:536-555` | `getPickingStockCheck` (pre-check stok) |
| `backend/src/modules/warehouse/warehouse.repository.js:184-235` | Query stok per barang+zona+kondisi |
| `backend/src/modules/capacity/capacity.service.js:1-190` | Recalc status zona setelah mutasi |
| `backend/src/modules/reconciliation/reconciliation.repository.js:76-298` | Rekonsiliasi project |
| `frontend/app/staff/outbound/[suratJalanId]/picking/page.tsx` | **UI picking** |
| `backend/prisma/schema.prisma:421-549` | Model `surat_jalan`, `surat_jalan_item`, `stok_gudang`, `stok_ledger` |

---

## B. Alur Picking Saat Ini

1. **SPV verifikasi SJ:** `approveOutbound` mengubah status SJ ke `disetujui` (`surat-jalan.service.js:592-664`).
2. **Staff buka halaman picking** (`picking/page.tsx`).
3. **Frontend pre-check stok:** memanggil `GET /api/warehouses/:gudang_id/picking-stock-check` yang mengembalikan stok per `barang_id+zona_id+kondisi` (`warehouse.service.js:536-555`).
4. **Staff pilih zona per item.** UI menyaring zona yang stoknya sesuai `kondisi` yang diminta SJ (`picking/page.tsx:105-111`).
5. **Jika kondisi tidak sesuai:** staff harus centang *"Tampilkan kondisi lain"* lalu pilih zona dengan kondisi berbeda. Ini memicu `overrideItemId` dan menampilkan modal override (`picking/page.tsx:897-899`, `244-341`).
6. **Submit:** frontend kirim `POST /:id/retrieve` dengan `items[]` berisi `zona_id`, `kondisi`, `catatan_kondisi` (`picking/page.tsx:674-677`).
7. **Backend `retrieve`** (`surat-jalan.service.js:1084-1287`):
   - Validasi SJ outbound, `gudang_asal_id` valid.
   - Loop per item dalam ** satu transaksi DB**:
     - Cek `pickedKondisi !== requestedKondisi` → butuh `catatan_kondisi` (line 1119).
     - Query `stok_gudang` by `gudang_id+barang_id+zona_id+kondisi+project_id` (line 1131).
     - Jika tidak ada stok → throw error dengan daftar kondisi lain di zona tersebut (line 1142-1178).
     - Jika `existingQty < qty` → throw error (line 1181).
     - **Kurang stok** (delete/update `stok_gudang`) + buat `stok_ledger` + `audit_log` (line 1188-1230).
     - Recalc status zona via `capacityService.recalculateZonaStatus` (line 1232).
   - Set `picking_selesai=true`, status ke `disetujui` (line 1235).

### Pengecekan Stok
- **Per gudang + zona + kondisi + project** (unique constraint `schema.prisma:527`).
- Backend retrieve pakai `findFirst` + `orderBy qty desc` (`surat-jalan.service.js:1131-1140`).

### Override
- **Kapan:** saat staff pilih kondisi berbeda dari yang diminta SJ.
- **Siapa:** staff/staf_gudang + supervisor (route authorize line 120).
- **Validasi:** `catatan_kondisi` wajib diisi backend (line 1119). UI memaksa isi alasan sebelum lanjut (picking page line 311-318).

### Deduk Stok
- Dilakukan di dalam `prisma.$transaction` pada line 1104, operasi delete/update `stok_gudang` (line 1188-1199) + insert `stok_ledger` (line 1201). **Atomik.**

---

## C. Akar Masalah

### 1. Override "manual" yang error-prone
- Staff harus **secara manual** menyadari bahwa kondisi diminta tidak ada, lalu mengecek checkbox *"Tampilkan kondisi lain"* (`picking/page.tsx:836-843`).
- Jika staff memilih kondisi berbeda tapi **membatalkan** modal override, `kondisiByItem` tetap berubah tapi `catatanKondisiByItem` kosong. Hasilnya `allAssigned` menjadi false dan tombol submit disabled tanpa penjelasan jelas (`picking/page.tsx:545-547`).
- Bukti: `surat-jalan.service.js:1119` — backend throw error jika override tanpa catatan.

### 2. Race condition antar pre-check dan deduk
- Pre-check di frontend (`fetchPickingStockCheck`) dan deduk di backend (`retrieve`) adalah dua operasi terpisah. Tidak ada mekanisme *reserve* stok.
- Jika 2 staff melakukan picking bersamaan untuk barang yang stoknya marginal, keduanya bisa lolos pre-check, tapi salah satu akan gagal di backend dengan error `Stok tidak mencukupi` (line 1181).

### 3. Picking parsial tidak didukung
- Seluruh items dalam request diproses dalam satu transaksi. Jika 1 item gagal (stok habis), **semua item digeser rollback** (line 1104-1250). Tidak ada parsial picking.

### 4. Zona tidak ikut terfilter di beberapa tempat
- `getPickingStockAvailability` mengembalikan stok **per zona** (`warehouse.repository.js:199-207`), tapi UI `getValidZonesForItem` hanya menampilkan zona dengan stok **sesuai kondisi diminta** (`picking/page.tsx:105-111`). Stok di zona lain dengan kondisi berbeda tidak muncul kecuali staff eksplisit mengecek *"Tampilkan kondisi lain"*.

### 5. Kondisi override tidak tercatat di `surat_jalan_item`
- Audit ada di `audit_log` (line 1211-1230), tapi tabel `surat_jalan_item` itself tidak menyimpan `kondisi_diambil` atau `override`. Hanya `kondisi` awal SJ yang tersimpan (`schema.prisma:477`). Ini menyulitkan pelacakan kondisi aktual yang di-pick tanpa join ke `audit_log`.

### 6. Potensi minus stok
- Backend sudah cek `existingQty < qty` sebelum deduk (line 1181), tapi tidak ada lock pessimistic (`SELECT ... FOR UPDATE`). Di bawah kondisi race condition tinggi, dua transaksi bisa membaca qty sama, lalu yang kedua gagal. Tidak ada minus stok, tapi ada error di runtime.

---

## D. Alur Setelah Picking

### Status Transitions Distribusi
- `disetujui` + `picking_selesai=true` → `sedang_dikirim` (`updateDeliveryStatus` line 1300-1316).
- `sedang_dikirim` → `diterima_didistribusikan` (line 1314).
- Atau langsung `disetujui` → `diterima_didistribusikan` via `confirmDistributed` (line 666-742).
- Semua transisi dicek: `picking_selesai !== false` (line 1305), status valid (line 1301).
- **Lengkap & ter-validasi urutannya.**

### Laporan Barang Sampai & Konfirmasi SPV
- `confirmDistributed` dipanggil SPV untuk menandai `diterima_didistribusikan` (line 666).
- Ada notifikasi ke admin, supervisor, staff (line 731-738).

### Rekonsiliasi Project
- `reconciliation.repository.js:86-123` agregasi `surat_jalan_item.qty` (rencana/approved) by project+barang.
- **Tidak mempertimbangkan kondisi aktual yang di-pick atau override.** Hanya `item.qty` dari SJ yang dipakai.
- **Potensi selisih:** jika picking dilakukan dengan kondisi berbeda + qty sama, rekonsiliasi tetap hitung qty SJ, bukan actual picked condition. Tidak ada kolom `actual_qty` atau `picked_kondisi` di laporan rekonsiliasi.

---

## E. Rencana Perbaikan

### Prioritas 1 (High) — Perbaiki UX Override & Pre-check
- **File:** `frontend/app/staff/outbound/[suratJalanId]/picking/page.tsx`, `backend/src/modules/warehouse/warehouse.service.js`
- **Perubahan:** Saat pre-check, jika kondisi diminta tidak tersedia, sistem otomatis menampilkan opsi zona+kondisi lain yang ada (tanpa harus centang checkbox). Override reason diintegrasikan langsung ke form, bukan modal terpisah.
- **Risiko:** Rendah — cuma perubahan UI + response format API.
- **Dampak migrasi:** Tidak ada.

### Prioritas 2 (High) — Atomic Stock Reservation
- **File:** `backend/src/modules/surat-jalan/surat-jalan.service.js`, `backend/prisma/schema.prisma`
- **Perubahan:** Tambah field `reserved_qty` di `stok_gudang` atau tabel terpisah `stok_reservation`. Saat pre-check, reserve stok; saat retrieve konfirmasi, convert reserve ke out; saat expire/unused, release reserve.
- **Risiko:** Medium — perlu migrasi data + cleanup job untuk expired reservation.
- **Dampak migrasi:** Tambah kolom `reserved_qty` Decimal default 0 di `stok_gudang`.

### Prioritas 3 (Medium) — Partial Picking & Remain Tracking
- **File:** `backend/src/modules/surat-jalan/surat-jalan.service.js`, `backend/prisma/schema.prisma`
- **Perubahan:** Support partial retrieve — item yang tidak ter-pick tetap di SJ dengan status `partial_picked`. Tambah field `qty_dipick` di `surat_jalan_item`.
- **Risiko:** Medium — ubah flow transaksi, perlu handle item partially picked.
- **Dampak migrasi:** Tambah kolom `qty_dipick` Decimal + update enum/status handling.

### Prioritas 4 (Medium) — Rekonsiliasi Actuals
- **File:** `backend/src/modules/reconciliation/reconciliation.repository.js`, `backend/prisma/schema.prisma`
- **Perubahan:** Tambah tabel `picking_actual` atau kolom `picked_kondisi` + `picked_qty` di `surat_jalan_item`. Rekonsiliasi join ke data aktual picking, bukan cuma `item.qty`.
- **Risiko:** Medium — ubah logika rekonsiliasi.
- **Dampak migrasi:** Backfill data aktual dari `audit_log` untuk picking yang sudah ada.

### Prioritas 5 (Low) — Override Audit di `surat_jalan_item`
- **File:** `backend/prisma/schema.prisma`, `backend/src/modules/surat-jalan/surat-jalan.service.js`
- **Perubahan:** Tambah kolom `kondisi_diambil` + `is_override` + `alasan_override` di `surat_jalan_item`. Salin dari `audit_log` saat retrieve selesai.
- **Risiko:** Rendah — cuma tambah kolom + update di service.
- **Dampak migrasi:** Backfill dari `audit_log` aksi `retrieve`.

---

## Langkah Implementasi (5 sesi kecil)

**Sesi 1 — Pre-check UI enhancement (Prioritas 1)**  
Ubah `warehouse.service.js:184-235` dan `picking/page.tsx:105-111` agar otomatis tampilkan zona+kondisi lain saat kondisi diminta kosong.

**Sesi 2 — Override inline + catatan wajib di form (Prioritas 1)**  
Ganti modal override terpisah dengan inline field catatan di tabel picking, dan validasi `allAssigned` lebih eksplisit.

**Sesi 3 — Atomic stock reservation (Prioritas 2)**  
Tambah `reserved_qty` di `stok_gudang`, update `getPickingStockAvailability` untuk substract reserved, update `retrieve` untuk transfer reserved → out.

**Sesi 4 — Partial picking support (Prioritas 3)**  
Ubah transaksi `retrieve` agar bisa partial: update qty per item, set `picking_selesai=false` jika masih ada item belum ter-pick, update frontend untuk show remaining qty.

**Sesi 5 — Rekonsiliasi actuals (Prioritas 4 + 5)**  
Tambah tabel/kolom untuk actual picked data, update `reconciliation.repository.js` untuk join ke actuals, backfill data lama.

---

*Dokumen ini dibuat read-only. Tidak ada file yang diubah.*
