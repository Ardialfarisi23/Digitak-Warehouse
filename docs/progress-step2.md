# Progress Step 2 — Auto Override Picking Flow

**Tanggal:** 2026-09-29  
**Branch:** fix/picking-override-flow

---

## Selesai

### A. Backend endpoint availability
- `backend/src/modules/warehouse/warehouse.repository.js:235-316` — fungsi `getPickingAvailability` baru.
- `backend/src/modules/warehouse/warehouse.service.js:558-585` — service wrapper.
- `backend/src/modules/warehouse/warehouse.controller.js:103-114` — controller.
- `backend/src/modules/warehouse/warehouse.routes.js:39` — route `GET /:gudang_id/picking-availability`.

### B. Backend validasi retrieve
- `backend/src/modules/surat-jalan/surat-jalan.service.js:1084-1186` — validasi override lebih ketat:
  - Jika `pickedKondisi !== requestedKondisi` tanpa `catatan_kondisi` → 400.
  - Jika override ke kondisi yang tidak ada stoknya → 400 dengan pesan jelas.
  - Jika override stok kurang → 400.
  - Pesan error kini menyertakan nama barang + zona.

### C. Frontend picking UI
- `frontend/app/staff/outbound/[suratJalanId]/picking/page.tsx`:
  - Hapus checkbox manual override dan `OverrideConfirmModal`.
  - Tambah `availabilityByItem` state + `fetchAvailability()` yang memanggil endpoint baru.
  - Saat zona/kondisi dipilih, otomatis fetch availability dan update panel.
  - Panel per item menampilkan:
    - `ok` → zona dengan kondisi requested.
    - `override_available` → daftar kondisi alternatif + field alasan inline.
    - `no_stock` / `no_zone` → pesan blokir, tidak ada opsi override.
  - `allAssigned` kini memakai `availabilityByItem`, bukan cek zona valid manual.

---

## Verifikasi

- **Syntax check backend:** lolos (`node -c` pada 5 file).
- **TypeScript frontend:** lolos (`npx tsc --noEmit`).
- **Smoke test endpoint:** `GET /api/warehouses/1/picking-availability` merespons (401 karena auth, artinya route terdaftar).

---

## Skenario yang akan/sudah diuji

1. **Stok sesuai kondisi SJ cukup** → `status: "ok"`, UI menampilkan zona normal, tanpa override.
2. **Kondisi beda ada alternatif** → `status: "override_available"`, UI menampilkan opsi kondisi lain + stok, staff pilih lalu isi alasan.
3. **Stok kosong (semua kondisi)** → `status: "no_stock"`, UI blokir item dengan pesan jelas.
4. **Qty > stok** → Backend tolak dengan `Stok barang X di zona tidak mencukupi (Tersedia: Y, Dibutuhkan: Z)`.

---

## Belum selesai / temuan perlu keputusan

- **Penyimpanan override di `surat_jalan_item`:** Saat ini hanya tercatat di `audit_log` (`kondisi_diminta`, `kondisi_diambil`, `override`, `catatan_kondisi`). Tabel `surat_jalan_item` tidak menyimpan data ini. Menurut aturan step ini, tidak boleh migration. Keputusan yang dibutuhkan: apakah cukup di `audit_log` atau perlu kolom baru di step berikutnya?
- **Unit test backend:** Belum ditambahkan. File test belum ada di repo (tidak ada jest/mocha). Keputusan: buat test file baru atau gunakan script eksperimental?
- **Test skenario manual 1-4:** Belum dijalankan karenabutuh data SJ + stok nyata di database. Bisa diuji setelah deploy ke staging.

---

## Commit

```
bbffc53 feat: auto override picking flow + strict backend validation
```

**File diubah:**
- backend/src/modules/surat-jalan/surat-jalan.service.js
- backend/src/modules/warehouse/warehouse.controller.js
- backend/src/modules/warehouse/warehouse.repository.js
- backend/src/modules/warehouse/warehouse.routes.js
- backend/src/modules/warehouse/warehouse.service.js
- frontend/app/staff/outbound/[suratJalanId]/picking/page.tsx
