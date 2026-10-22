# Diagnosa: BOQ draft/ditolak/selesai muncul di dropdown Surat Jalan

## FASE 1: TEMUAN

### A. Form/Modal pengajuan Surat Jalan dan dropdown BOQ

**Outbound (form pengajuan baru):**
- Path: `frontend/app/staff/outbound/new/page.tsx`
- Dropdown BOQ: `BoqPicker` dipakai pada baris 748-755
- Tidak ada `statusFilter` yang dilewatkan ke `BoqPicker`
- Outbound page juga memanggil `GET /api/boqs?projectId=${projectId}&status=aktif` di baris 493 untuk keperluan lain (state `boqs`), tapi `BoqPicker` tetap memanggil `/api/boqs` tanpa filter status.

**Inbound (form pengajuan baru):**
- Path: `frontend/app/staff/inbound/page.tsx`
- Dropdown BOQ: `BoqPicker` dipakai pada baris 761-771
- Tidak ada `statusFilter` yang dilewatkan ke `BoqPicker`

**Rekonsiliasi:**
- Path: `frontend/app/dashboard/reconciliation/page.tsx`
- Dropdown BOQ: `BoqPicker` dipakai pada baris 1306-1319
- Tidak ada `statusFilter` yang dilewatkan

### B. Endpoint/query backend daftar BOQ

**Endpoint:** `GET /api/boqs`
**Route:** `backend/src/modules/boq/boq.routes.js:25` → `boqController.findAll`
**Controller:** `backend/src/modules/boq/boq.controller.js:79-90` → `boqService.findAll(req.query)`
**Service:** `backend/src/modules/boq/boq.service.js:366-368` → `boqRepository.findAll(query)`
**Repository:** `backend/src/modules/boq/boq.repository.js:71-140`

Filter yang ada saat ini di `findAll`:
- `status` (single value, opsional, hanya `draft|aktif|selesai|ditolak`)
- `projectId` (via relasi `tiket.project_id`)
- `area` (via relasi `tiket.area`, case-insensitive)
- `warehouseId` (via relasi `items.gudang_tujuan_id`)
- `search` (kode_tiket atau area, case-insensitive)
- `sortBy` + `sortOrder`

Tidak ada filter default untuk status. Jika `status` tidak dikirim, semua status dikembalikan.

### C. Nilai enum `boq_status` dari schema.prisma

Path: `backend/prisma/schema.prisma:756-761`

```prisma
enum boq_status {
  draft
  aktif
  selesai
  ditolak
}
```

- **Dilarang muncul di dropdown SJ:** `draft`, `selesai`, `ditolak`
- **Boleh muncul:** `aktif`

### D. Endpoint dipakai halaman lain

`GET /api/boqs` dipakai oleh:
1. `frontend/app/dashboard/page.tsx:342` — dashboard ringkasan (`page=1&limit=5`)
2. `frontend/app/dashboard/boq/page.tsx:314` — halaman manajemen BOQ
3. `frontend/app/dashboard/supervisor/boq/page.tsx:270` — halaman BOQ supervisor
4. `frontend/hooks/use-supervisor-dashboard.ts:322` — dashboard supervisor (`limit=1000`)
5. `frontend/app/staff/outbound/new/page.tsx:493` — ambil list BOQ aktif untuk project (`status=aktif`)
6. `frontend/app/dashboard/reconciliation/page.tsx` — via `BoqPicker`

**Kesimpulan:** Endpoint yang sama dipakai banyak halaman. JANGAN ubah perilaku default. Solusi: tambahkan query param opsional `excludeStatus` (comma-separated) di backend, dan `BoqPicker` harus bisa meneruskan param itu. Halaman surat jalan (outbound + inbound) akan mengirim `excludeStatus=draft,selesai,ditolak`.

### E. Validasi POST pembuatan Surat Jalan

**Sudah ada.** Pada `backend/src/modules/surat-jalan/surat-jalan.service.js:201-208`:

```javascript
if (data.boq_id) {
  const boq = await prisma.boq.findUnique({
    where: { boq_id: Number(data.boq_id) },
    select: { boq_id: true, status: true, boq_number: true },
  });
  if (!boq || boq.status !== "aktif") {
    throw new AppError("Tidak dapat membuat surat jalan — BOQ/Project terkait belum diaktifkan oleh Admin.", 400);
  }
}
```

Fungsi `createStaffInbound` (baris 340) memanggil `create`, jadi validasi ini juga berlaku untuk inbound.
Namun pesan error saat ini generik ("belum diaktifkan"). Perlu diperbaiki pesannya agar menyebut status yang dilarang secara spesifik.

---

## FASE 2: PERBAIKAN

### File yang diubah

1. **`backend/src/modules/boq/boq.repository.js`**
   - Menambahkan konstanta `EXCLUDED_BOQ_STATUSES_FOR_SJ = ["draft", "selesai", "ditolak"]` di baris 8.
   - Menambahkan parameter `excludeStatus` pada `findAll` (baris 72).
   - Menambahkan logika `notIn` untuk filter `excludeStatus` di baris 84-99.

2. **`frontend/components/BoqPicker.tsx`**
   - Menambahkan prop `excludeStatus?: string` dan `emptyMessage?: string` pada interface `BoqPickerProps` (baris 26, 28).
   - Mengirim `excludeStatus` sebagai query param ke `/api/boqs` (baris 91).
   - Menambahkan `excludeStatus` ke dependency array useEffect (baris 113).
   - Menggunakan `emptyMessage` saat results kosong (baris 232).

3. **`frontend/app/staff/outbound/new/page.tsx`**
   - Menambahkan `excludeStatus="draft,selesai,ditolak"` dan `emptyMessage="Tidak ada BOQ yang dapat diajukan."` pada `<BoqPicker>` (baris 755-756).

4. **`frontend/app/staff/inbound/page.tsx`**
   - Menambahkan `excludeStatus="draft,selesai,ditolak"` dan `emptyMessage="Tidak ada BOQ yang dapat diajukan."` pada `<BoqPicker>` (baris 770-771).

5. **`backend/src/modules/surat-jalan/surat-jalan.service.js`**
   - Memperbaiki pesan error validasi BOQ agar menyebut status spesifik (baris 206-208).
   - Pesan lama: `"Tidak dapat membuat surat jalan — BOQ/Project terkait belum diaktifkan oleh Admin."`
   - Pesan baru: `` `BOQ berstatus ${boq.status} tidak dapat diajukan Surat Jalan.` ``

### Nilai enum yang diblokir
- `draft`
- `selesai`
- `ditolak`

Yang boleh: `aktif`.

### Endpoint dipakai halaman lain dan cara menangani
`GET /api/boqs` dipakai dashboard, halaman BOQ, supervisor, dan rekonsiliasi. Tidak diubah perilaku default-nya. Filter baru bersifat opsional melalui query param `excludeStatus`. Hanya surat jalan (outbound + inbound) yang mengirim param ini.

### Validasi POST
Validasi BOQ aktif sudah ada di `create()` (baris 201-209). Pesan error diperbaiki menjadi spesifik. `createStaffInbound` memanggil `create` jadi ikut tercover.

### Edge case
Tidak ada mode edit draft Surat Jalan di form yang ditemukan. Jika BOQ yang terpilih kini berstatus terlarang, BoqPicker akan menampilkan daftar kosong dengan pesan "Tidak ada BOQ yang dapat diajukan." dan backend akan menolak POST dengan pesan spesifik.

### Cara tes manual
1. Buat BOQ dengan status `draft`, `selesai`, dan `ditolak` untuk project yang sama.
2. Buka form `Ajukan Surat Jalan Baru` (`/staff/outbound/new`), pilih project tersebut.
3. Klik dropdown BOQ — harus HANYU menampilkan BOQ berstatus `aktif`.
4. Ulangi untuk form inbound (`/staff/inbound`).
5. Coba kirim pengajuan dengan `boq_id` yang statusnya `ditolak` via curl/Postman:
   ```
   POST /api/surat-jalan
   Body: { "tipe": "outbound", "boq_id": <ID_BOQ_DITOLAK>, "items": [...] }
   ```
   Harus dapat 400 dengan pesan: `BOQ berstatus ditolak tidak dapat diajukan Surat Jalan.`
6. Coba buka halaman dashboard BOQ (`/dashboard/boq`) — harus tetap menampilkan semua status (termasuk draft/ditolak/selesai) karena tidak mengirim `excludeStatus`.
