# DIAGNOSIS: Halaman Detail Rejected Approval

## 1. Daftar File Terkait

| Path | Peran |
|------|-------|
| `frontend/app/dashboard/supervisor/approval/rejected/[id]/page.tsx` | Halaman detail rejected yang dilaporkan |
| `frontend/app/dashboard/supervisor/approval/rejected/page.tsx` | Daftar rejected (list) |
| `frontend/app/dashboard/supervisor/approval/outbound/[id]/page.tsx` | Halaman approval outbound ( sumber bug ) |
| `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx` | Halaman approval inbound ( referral ) |
| `frontend/app/dashboard/supervisor/delivery/page.tsx` | Halaman delivery ( referral ) |
| `backend/src/modules/surat-jalan/surat-jalan.routes.js` | Routing API |
| `backend/src/modules/surat-jalan/surat-jalan.controller.js` | Controller |
| `backend/src/modules/surat-jalan/surat-jalan.service.js` | Service layer |
| `backend/src/modules/surat-jalan/surat-jalan.repository.js` | Repository / query |
| `backend/src/modules/surat-jalan/surat-jalan.validation.js` | Validasi payload |
| `backend/prisma/schema.prisma` | Skema database |

---

## 2. Titik Putus Rantai Catatan Penolakan

### Temuan Utama: Outbound rejection tidak menyimpan catatan

**Jalur data saat menolak outbound dari halaman approval outbound:**

1. **Frontend (salah):** `frontend/app/dashboard/supervisor/approval/outbound/[id]/page.tsx:296`
   ```ts
   const resp = await put(`${apiBase}/api/surat-jalan/${params.id}/reject-outbound`, {
     alasan: rejectReason,  // <-- FIELD NAME SALAH
   });
   ```

2. **Backend controller:** `backend/src/modules/surat-jalan/surat-jalan.controller.js:141`
   ```js
   const result = await suratJalanService.rejectOutbound(req.params.id, req.body.catatan, req.user.id);
   // req.body.catatan adalah undefined karena frontend mengirim "alasan"
   ```

3. **Service:** `backend/src/modules/surat-jalan/surat-jalan.service.js:763`
   ```js
   await suratJalanRepository.updateStatus(id, "ditolak", { catatan }, tx);
   // catatan = undefined -> disimpan sebagai null
   ```

4. **Repository:** `backend/src/modules/surat-jalan/surat-jalan.repository.js:400-402`
   ```js
   if (status === "ditolak" && options && options.catatan !== undefined) {
     data.catatan = options.catatan || null;
   }
   ```

**Kesimpulan putus:** **(a) tidak dikirim frontend dengan benar** — Outbound approval page mengirim `alasan` di payload, tetapi backend mengharapkan `catatan`. Akibatnya `catatan` selalu `null` di database untuk outbound yang ditolak melalui halaman ini.

### Verifikasi Data ID 38

```
surat_jalan (id=38):
  - tipe: outbound
  - status: ditolak
  - catatan: null
  - kategori_approval: manual_override

approval_log (entity_id=38, status=ditolak):
  - catatan: null
```

**Inbound rejections bekerja dengan benar** (contoh id=20, catatan="Kurang cocok sih"; id=7, catatan="barang aneh") karena halaman inbound mengirim `catatan` dengan benar.

### Other observations

- `findById` di repository menggunakan `include`, sehingga semua field scalar termasuk `catatan` dikembalikan.
- `findRejectedList` menggunakan `select` dan secara eksplisit menyertakan `catatan: true`.
- Frontend rejected detail (`page.tsx:109`) membaca `detail.catatan ?? rejectLog?.catatan ?? null` — logika fallback sudah benar.
- `fetchRejectLog` di halaman rejected detail memanggil `/api/surat-jalan/rejected?page=1&limit=1` yang hanya mengambil 1 baris. Jika ID bukan di page 1, `rejectLog` menjadi null. Namun `detail.catatan` seharusnya sudah cukup sebagai sumber utama.

---

## 3. Hasil Cek Data ID 38

| Kolom | Nilai |
|-------|-------|
| `surat_jalan.catatan` | **null** (tidak ada catatan) |
| `approval_log.catatan` | **null** (tidak ada catatan) |
| `surat_jalan.kategori_approval` | `manual_override` |

Tidak ada data sensitif yang diekspos.

---

## 4. Lokasi & Dampak Penghapusan "Kategori Persetujuan"

**Lokasi render:**
- `frontend/app/dashboard/supervisor/approval/rejected/[id]/page.tsx:224-227`
  ```tsx
  <Field
    label="Kategori Persetujuan"
    value={detail.kategori_approval ?? <span className="italic text-slate-400">-</span>}
  />
  ```

**Data sumber:** `detail.kategori_approval` dari endpoint `GET /api/surat-jalan/:id`.

**Dampak penghapusan:**
- `Field` adalah komponen lokal (didefinisikan di `page.tsx:312-319`), **bukan komponen bersama**.
- Di file yang sama, `kategori_approval` **tidak dipakai** untuk filter, badge, kondisi tampil, atau export.
- Halaman lain yang terdampak: **tidak ada** — penghapusan hanya affects tampilan halaman rejected detail.
- Catatan: kolom database `kategori_approval` di `surat_jalan` **tidak dihapus**, hanya disembunyikan dari UI.

---

## 5. Rencana Perbaikan (Belum Dieksekusi)

### Perbaikan 1: Catatan penolakan outbound tidak muncul

**Root cause:** `frontend/app/dashboard/supervisor/approval/outbound/[id]/page.tsx:296` mengirim `alasan` tetapi backend mengharapkan `catatan`.

**Solusi:**
- Ubah payload di `outbound/[id]/page.tsx:296` dari `{ alasan: rejectReason }` menjadi `{ catatan: rejectReason }`.
- Ini menyelaraskan dengan:
  - Validation schema (`rejectOutboundSchema` expects `catatan`)
  - Controller (`req.body.catatan`)
  - Delivery page yang sudah benar (`delivery/page.tsx:246` mengirim `{ catatan: alasan }`)
  - Inbound page yang sudah benar (`inbound/[id]/page.tsx:132` mengirim `{ catatan: rejectReason }`)

**Apakah aman bagi data yang sudah ada?**
- Ya. Perubahan hanya memperbaiki jalur penyimpanan catatan untuk rejection yang terjadi setelah perbaikan.
- Data lama yang `catatan`-nya `null` tetap `null` — tidak ada backfill atau update data lama.

### Perbaikan 2: Menghilangkan kolom "Kategori Persetujuan"

**Solusi:**
- Hapus blok `<Field label="Kategori Persetujuan" ... />` di `frontend/app/dashboard/supervisor/approval/rejected/[id]/page.tsx:224-227`.

**Apakah aman bagi data yang sudah ada?**
- Ya. Hanya menghilangkan dari tampilan. Kolom database dan API tetap tidak diubah.

### Apakah diperlukan perubahan backend?

- **Tidak** untuk perbaikan #2 (hanya UI).
- **Tidak** untuk perbaikan #1 jika frontbound sudah diperbaiki mengirim `catatan` — backend sudah benar membaca `req.body.catatan`.

### Konfirmasi tidak ada perubahan skema/data database

- Tidak ada `ALTER`, `UPDATE`, `DELETE`, `migrate`, `db push`, atau `seed` yang diperlukan.
- Perbaikan #1 hanya mengubah nama field di payload frontend.
- Perbaikan #2 hanya menghapus elemen JSX.

---

## 6. Risiko & Hal yang Perlu Dicek Manual

1. **Outbound rejections yang sudah ada** dengan `catatan: null` tetap null setelah perbaikan. Jika diperlukan, catatan lama tidak bisa di-backfill tanpa input manual.
2. Setelah memperbaiki payload outbound, lakukan test end-to-end:
   - Tolak outbound dari halaman approval outbound.
   - Cek halaman rejected detail — pastikan catatan muncul.
3. Periksa apakah ada tempat lain di frontend yang juga mengirim `alasan` ke endpoint reject-outbound (selalu gunakan `grep` untuk `reject-outbound`).
4. Pastikan Prisma client telah di-generate setelah migrasi terakhir (untuk memastikan field `catatan` dikenali).
