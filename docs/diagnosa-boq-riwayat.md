# Diagnosa: Riwayat Perubahan (BOQ)

## 1. Stack singkat
- **Backend:** Node.js + Express + Prisma ORM (PostgreSQL).
- **Frontend:** Next.js 16 + React + Tailwind.

## 2. Peta file terkait

| Path | Baris | Peran |
|------|-------|-------|
| `backend/prisma/schema.prisma` | 351-379 | Model `boq`: `updated_at` pakai `@default(now())` (tanpa `@updatedAt`), relasi `creator`/`updater` ke `user_account`. |
| `backend/src/modules/boq/boq.repository.js` | 42-68 | `findById` sudah include `creator`/`updater`. |
| `backend/src/modules/boq/boq.repository.js` | 120-147 | `findAll` TIDAK include `creator`/`updater` (hanya `diaktifkan_user`). |
| `backend/src/modules/boq/boq.repository.js` | 160-180 | Fungsi `update` BOQ memakai Prisma Client, tapi tidak set `updated_at`. |
| `backend/src/modules/boq/boq.service.js` | 380-398 | Service `update` BOQ hanya set `updated_by: userId`, tidak set `updated_at`. |
| `backend/src/modules/boq/boq.controller.js` | 5-67 | `transformBoq` memetakan `createdBy`/`updatedBy` dengan bug precedence operator. |
| `backend/src/modules/boq/boq.controller.js` | 79-99 | Controller list/detail/update memakai `transformBoq`. |
| `frontend/app/dashboard/boq/page.tsx` | 581-583 | `openDetailModal` menyetel `detailBoq` dari objek list (bukan fetch detail by-id). |
| `frontend/app/dashboard/boq/page.tsx` | 1928-1933 | Footer modal detail BOQ menampilkan `detailBoq.createdBy`/`updatedBy` secara langsung. |

## 3. Akar masalah #1 ("oleh 4")

**Penjelasan:**
Ada dua penyebab ganda:
1. **Bug operator precedence di backend:** di `transformBoq` (`boq.controller.js:40-41`), ekspresi `boq.creator?.nama || boq.created_by ? String(boq.created_by) : ""` dievaluasi sebagai `(boq.creator?.nama || boq.created_by) ? String(boq.created_by) : ""`. Karena `creator?.nama` biasanya terisi, kondisi menjadi truthy dan mengembalikan `String(boq.created_by)` yaitu ID mentah, bukan nama.
2. **Data list tidak menyertakan nama user:** `findAll` di `boq.repository.js:120-147` tidak melakukan `include` `creator`/`updater`, sementara `detailBoq` di frontend (`page.tsx:581-583`) diisi dari data list, bukan dari endpoint detail by-id yang sudah include relasi user.

**Potongan kode bukti:**
- `backend/src/modules/boq/boq.controller.js:40-41`:
  ```
  createdBy: boq.creator?.nama || boq.created_by ? String(boq.created_by) : "",
  updatedBy: boq.updater?.nama || boq.updated_by ? String(boq.updated_by) : "",
  ```
- `backend/src/modules/boq/boq.repository.js:120-147` — `findAll` tanpa `include: { creator: true, updater: true }`.
- `frontend/app/dashboard/boq/page.tsx:581-583` — `setDetailBoq(boq)` dari list.
- `frontend/app/dashboard/boq/page.tsx:1929,1933` — cetak `detailBoq.createdBy`/`updatedBy` langsung.

## 4. Akar masalah #2 ("Diubah" tidak berubah)

**Penjelasan:**
Kolom `updated_at` di model `boq` hanya memiliki `@default(now())` yang hanya aktif saat INSERT. Service `update` BOQ hanya mengisi `updated_by`, dan repository `update` juga tidak menambahkan `updated_at` pada query update. Akibatnya `updated_at` tidak pernah berubah saat BOQ diedit.

**Potongan kode bukti:**
- `backend/prisma/schema.prisma:365` — `updated_at      DateTime         @default(now())` (tanpa `@updatedAt`).
- `backend/src/modules/boq/boq.service.js:393-398` — `updateData` hanya `...boqData, updated_by: userId` (tidak ada `updated_at`).
- `backend/src/modules/boq/boq.repository.js:160-180` — `prisma.boq.update({ where, data: boqData })` tanpa `updated_at`.

## 5. Tingkat keyakinan
- **"oleh 4": Tinggi** — dua bukti di atas sudah jelas.
- **"Diubah" tidak berubah: Tinggi** — sama pola dengan Project yang sudah diperbaiki.

## 6. Rencana perbaikan yang diusulkan

1. **Backend — Controller `transformBoq`**
   - Perbaiki precedence operator pada baris 40-41 menjadi:
     - `createdBy: boq.creator?.nama || (boq.created_by ? String(boq.created_by) : "")`
     - `updatedBy: boq.updater?.nama || (boq.updated_by ? String(boq.updated_by) : "")`

2. **Backend — Repository `findAll`**
   - Tambah `include: { creator: { select: { nama: true } }, updater: { select: { nama: true } } }` pada `findAll` agar data list juga membawa nama user.

3. **Backend — Schema + Service/Repository `updated_at`**
   - Tambahkan `@updatedAt` pada field `updated_at` model `boq` di `schema.prisma`.
   - Jalankan `prisma migrate dev --create-only` untuk membuat migrasi, lalu `prisma generate`.
   - Jika ada drift/reset yang diminta Prisma: laporkan dulu, jangan setuju reset.
   - Alternatif sementara jika migrasi ditunda: di `boq.service.js` update, tambahkan `updated_at: new Date()` ke `updateData`, dan di repository `update` pastikan `prisma.boq.update` menerima `updated_at` eksplisit.

4. **Frontend — `page.tsx`**
   - Karena detail modal BOQ menggunakan data list, pastikan `detailBoq` yang ditampilkan adalah data terbaru setelah refetch.
   - Cek apakah setelah edit BOQ, daftar di-refetch dan `detailBoq` diperbarui. Jika tidak, sinkronkan seperti yang dilakukan di master-data Project.

5. **Verifikasi**
   - Edit satu BOQ, buka detail, pastikan "Diubah" berubah dan "oleh ..." menampilkan nama user.

## 7. Risiko/dampak ke fitur lain
- Perubahan `transformBoq` berdampak ke semua endpoint yang memakai transformasi itu: `create`, `findAll`, `findById`, `update`, `updateStatus`, `restore`, `getSummary`, `exportBoqs`. Namun perubahan hanya memperbaiki nilai `createdBy`/`updatedBy` dari ID menjadi nama, jadi konsumen API akan otomatis mendapat nama tanpa perlu ubah frontend.
- Penambahan `include` di `findAll` menambah join ke `user_account`, namun performa tetap aman karena tabel kecil dan sudah ada relasi.
- Perubahan `@updatedAt` pada model `boq` butuh migrasi + `prisma generate` dengan backend dimatikan.
