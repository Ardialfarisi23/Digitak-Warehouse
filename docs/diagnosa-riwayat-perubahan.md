# Diagnosa: Riwayat Perubahan (Project)

## 1. Stack singkat
- **Backend:** Node.js + Express + Prisma ORM (PostgreSQL).
- **Frontend:** Next.js 16 + React + Tailwind.

## 2. Peta file terkait

| Path | Baris | Peran |
|------|-------|-------|
| `backend/prisma/schema.prisma` | 126-155 | Model `project`, relasi `creator`/`updater`, field `updated_at` pakai `@default(now())`. |
| `backend/src/modules/projects/project.service.js` | 113-130 | Fungsi `update` Project hanya set `updated_by`, **tidak** set `updated_at`. |
| `backend/src/modules/projects/project.repository.js` | 103-109 | Query `update` Project tanpa `updated_at`. |
| `backend/src/modules/projects/project.repository.js` | 13-32 | `findByProjectId` tanpa `include` relasi user. |
| `backend/src/modules/projects/project.repository.js` | 72-86 | `findAll` tanpa `include` relasi user. |
| `backend/src/modules/projects/project.controller.js` | 31-38 | Controller `update` Project mengembalikan data mentah tanpa mapping nama user. |
| `frontend/app/master-data/page.tsx` | 577-591 | Komponen `DetailModal` yang menampilkan "Riwayat Perubahan". |
| `frontend/app/master-data/page.tsx` | 2243, 2374, 2576 | Sumber `record` di `DetailModal` berasal dari data tabel (list endpoint). |
| `frontend/app/master-data/page.tsx` | 2009-2068 | Fungsi `fetchMasterData` mengambil data dari endpoint list tanpa caching tambahan. |
| `frontend/app/dashboard/boq/page.tsx` | 1928-1933 | Referensi pola frontend yang benar menampilkan `createdBy`/`updatedBy` (nama user). |
| `backend/src/modules/boq/boq.controller.js` | 40-41 | Referensi pola backend yang benar memetakan `creator?.nama` / `updater?.nama`. |
| `backend/src/modules/boq/boq.repository.js` | 64-65 | Referensi pola backend yang benar melakukan `include` `creator` dan `updater`. |

## 3. Akar masalah #1 ("oleh 1")

**Penjelasan:**
`DetailModal` di frontend menampilkan `created_by` dan `updated_by` secara langsung tanpa resolve ke nama user. Di backend, repository method `findByProjectId` dan `findAll` tidak melakukan `include` relasi `creator`/`updater`, dan controller tidak memetakan ID ke nama user (`user_account.nama`). Akibatnya yang tampil di UI adalah ID mentah (angka 1).

**Potongan kode bukti:**
- `frontend/app/master-data/page.tsx:583` — `{(record as any)?.created_by ? \` oleh ${(record as any).created_by}\` : ""}`
- `frontend/app/master-data/page.tsx:587` — `{(record as any)?.updated_by ? \` oleh ${(record as any).updated_by}\` : ""}`
- `backend/src/modules/projects/project.repository.js:13-32` — `findByProjectId` hanya `where: { project_id: id }`, tanpa `include`.
- `backend/src/modules/projects/project.repository.js:72-86` — `findAll` juga tanpa `include` creator/updater.
- `backend/src/modules/projects/project.controller.js:31-38` — mengembalikan `result` service langsung (mentah).

## 4. Akar masalah #2 ("Diubah terakhir" tidak berubah)

**Penjelasan:**
Kolom `updated_at` di model `project` didefinisikan dengan `@default(now())` di Prisma. Pada Prisma, `@default(now())` hanya dieksekusi saat **INSERT**, bukan saat **UPDATE**. Service `update` Project hanya mengisi `updated_by`, sedangkan repository juga tidak menambahkan `updated_at` pada query update. Akibatnya `updated_at` tetap bernilai sama dengan `created_at`, sehingga "Diubah terakhir" tidak pernah berubah meskipun data Project diedit.

**Potongan kode bukti:**
- `backend/prisma/schema.prisma:139` — `updated_at      DateTime         @default(now())`
- `backend/src/modules/projects/project.service.js:124-127` — `const updateData = { ...data, updated_by: Number(userId) };` (tidak ada `updated_at`).
- `backend/src/modules/projects/project.repository.js:103-109` — `prisma.project.update({ where: { project_id: id }, data })` tanpa `updated_at`.

## 5. Tingkat keyakinan dan hal yang masih perlu diverifikasi

| Akar masalah | Tingkat keyakinan | Hal yang perlu diverifikasi |
|--------------|-------------------|----------------------------|
| "oleh 1" | **Tinggi** | Pastikan kolom nama user di tabel `user_account` adalah `nama` (sesuai `schema.prisma:12`). |
| "Diubah terakhir" | **Tinggi** | Pastikan tidak ada trigger/event DB di PostgreSQL yang seharusnya meng-update `updated_at` (tidak ditemukan dalam migrasi Prisma). |

## 6. Rencana perbaikan yang diusulkan

Perubahan diurutkan per langkah kecil:

1. **Skema & migrasi**
   - Ubah definisi `updated_at` pada model `project` di `schema.prisma` dari `@default(now())` menjadi `@updatedAt`.
   - Jalankan migrasi Prisma untuk menerapkan perubahan ke DB.

2. **Backend — Repository**
   - Di `project.repository.js`, ubah `findByProjectId` dan `findAll` untuk menambahkan `include: { creator: { select: { nama: true } }, updater: { select: { nama: true } } }`.
   - Pastikan `findAll` tetap menjaga performa (join ke `user_account` aman karena sudah ada index pada `email`, relasi ini hanya menambah join kecil).

3. **Backend — Controller / Mapping**
   - Di `project.controller.js` (atau buat helper khusus), petakan hasil Prisma sebelum dikirim ke frontend agar konsisten:
     - `createdAt` dari `record.created_at`
     - `updatedAt` dari `record.updated_at`
     - `createdBy` dari `record.creator?.nama ?? String(record.created_by)`
     - `updatedBy` dari `record.updater?.nama ?? String(record.updated_by)`
   - Ikuti pola yang sudah ada di `backend/src/modules/boq/boq.controller.js:40-41`.

4. **Frontend — DetailModal**
   - Di `frontend/app/master-data/page.tsx` (DetailModal), ganti penggunaan raw `created_by`/`updated_by` menjadi `record.createdBy`/`record.updatedBy`.
   - Pertimbangkan juga menyesuaikan pengecekan `hasAudit` agar tetap menampilkan blok "Riwayat Perubahan" jika salah satu field audit tersedia.

5. **Opsional — Audit log update**
   - Tambahkan penulisan `audit_log` pada aksi update Project di `project.service.js` (mengikuti pola di `boq.service.js` atau `titik_lapangan.service.js`) agar ada catatan riwayat terpisah di tabel `audit_log`.

6. **Verifikasi**
   - Edit data Project, buka kembali detail, pastikan "Diubah terakhir" berubah dan "oleh ..." menampilkan nama user.

## 7. Risiko / dampak ke fitur lain

- **Perubahan `@default(now())` → `@updatedAt`** hanya berdampak ke model `project`. Jika ada logic lain yang bergantung pada `updated_at` yang **tidak berubah** (mis. pembanding `created_at == updated_at` untuk menandai "belum pernah diubah"), logic tersebut akan berubah. Periksa kondisi tersebut sebelum migrasi.
- **Penambahan `include` creator/updater** di `findAll`/`findByProjectId` akan menambah join query, namun dampak performa kecil karena tabel `user_account` sudah di-index.
- **Mapping controller** berpotensi mempengaruhi konsumen API lain jika ada yang bergantung pada field mentah `created_by`/`updated_by`. Risiko kecil karena API master data umumnya hanya dipakai oleh frontend halaman ini.
