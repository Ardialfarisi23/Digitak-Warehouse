# Spec: Fitur Penyesuaian Additional

## 1. Skema Prisma

```prisma
model additional_adjustment {
  adjustment_id BigInt     @id @default(autoincrement())
  project_id    BigInt
  barang_id     BigInt
  qty           Decimal    @db.Decimal(14, 2)
  alasan        String     @db.Text
  created_by    BigInt
  created_at    DateTime   @default(now())

  project project   @relation(fields: [project_id], references: [project_id])
  barang  barang    @relation(fields: [barang_id], references: [barang_id])
  creator user_account @relation("additional_adjustment_created_by", fields: [created_by], references: [user_id])

  @@index([project_id, barang_id, created_at])
  @@index([created_by])
}
```

Relasi opsional ditambahkan di model `project`, `barang`, `user_account`:
```
additional_adjustments additional_adjustment[]
```

### Migrasi SQL (untuk dijalankan oleh tim)
```sql
-- CreateTable
CREATE TABLE "additional_adjustment" (
    "adjustment_id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "barang_id" BIGINT NOT NULL,
    "qty" DECIMAL(14,2) NOT NULL,
    "alasan" TEXT NOT NULL,
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "additional_adjustment_pkey" PRIMARY KEY ("adjustment_id")
);

-- CreateIndex
CREATE INDEX "additional_adjustment_project_id_barang_id_created_at_idx" 
  ON "additional_adjustment"("project_id", "barang_id", "created_at");
CREATE INDEX "additional_adjustment_created_by_idx" 
  ON "additional_adjustment"("created_by");

-- ForeignKeys (jika tidak ditangkap Prisma migrate)
ALTER TABLE "additional_adjustment" 
  ADD CONSTRAINT "additional_adjustment_project_id_fkey" 
  FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "additional_adjustment" 
  ADD CONSTRAINT "additional_adjustment_barang_id_fkey" 
  FOREIGN KEY ("barang_id") REFERENCES "barang"("barang_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "additional_adjustment" 
  ADD CONSTRAINT "additional_adjustment_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "user_account"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

## 2. Perubahan Perhitungan

Ganti semua lokasi agregasi `is_kelebihan` dengan query ke tabel baru:

- `backend/src/modules/boq/boq.repository.js:437-493`
- `backend/src/modules/dashboard/dashboard.service.js:275-286`
- `backend/src/modules/reconciliation/reconciliation.repository.js:276-288` dan `:412-443`
- `backend/src/modules/reports/reports.repository.js:1790-1827`

Perubahan minimal: buat helper baru `getAdditionalQtyByProjectBarang(projectId?, barangId?)` di file baru `backend/src/modules/additional/additional.repository.js` yang mengembalikan Map atau number. Panggil helper tersebut di 4 lokasi di atas, ganti `additionalByBarang.set(...)` dengan nilai dari helper.

Rumus `remains` tetap: `remains = MOS - (BOQ + additional) - used - approvedReturnQty` (`backend/src/modules/reconciliation/reconciliation.utils.js:19-21`).

## 3. Endpoint Baru

```
POST /api/additional-adjustments
```

- Auth: `authenticate`, `authorize("SUPERVISOR", "ADMIN")`
- Request body:
  ```json
  {
    "project_id": 1,
    "barang_id": 2,
    "qty": 10,
    "alasan": "Kelebihan kiriman vendor"
  }
  ```
- Validasi (Zod):
  - `qty`: number, tidak boleh 0, boleh negatif
  - `alasan`: string, min 5 karakter
  - Hitung total existing `qty` untuk `(project_id, barang_id)`; tolak jika `existing + qty < 0`
- Response: `{ adjustment_id, project_id, barang_id, qty, alasan, created_at }`
- Tidak ada update/delete; koreksi = entri baru dengan qty negatif.

### Audit log
```js
await prisma.audit_log.create({
  data: {
    entity_type: "additional_adjustment",
    entity_id: BigInt(result.adjustment_id),
    aksi: "create",
    actor_id: BigInt(actorId),
    data_sebelum: null,
    data_sesudah: { project_id, barang_id, qty, alasan }
  }
});
```

Pola diambil dari `backend/src/modules/boq/boq.service.js:371-375` dan `backend/src/modules/reports/reports.controller.js:741-745`.

## 4. Frontend

### Lokasi perubahan
- `frontend/app/dashboard/reconciliation/page.tsx`
- `frontend/app/dashboard/supervisor/reconciliation/page.tsx`

### Komponen yang ditiru
Pola input number editUsed di `frontend/app/dashboard/reconciliation/page.tsx:1452-1458`:
- `type="number"`, `min={0}` atau tanpa min (karena boleh negatif), `onChange` update state baris.
Pola modal edit user di `frontend/app/dashboard/users/page.tsx:465-525` untuk struktur form + validasi + submit PUT.

### Perubahan UI
1. Tambah kolom "Additional" editable di tabel rekonsiliasi (sudah ada sebagai tampilan).
2. Tambah tombol "+" / edit di setiap baris project+barang.
3. Form: input qty (number), input alasan (text, required, min 5 char).
4. Tampilkan riwayat di panel detail baris: daftar `additional_adjustment` untuk `(project_id, barang_id)`.

## 5. Risiko / Edge Case

1. Data lama: nilai `additional` sebelumnya dihitung dari `is_kelebihan=true`. Setelah migrasi, data lama tetap valid karena perhitungan berganti ke tabel baru; tidak ada backfill wajib untuk konsistensi hitung.
2. Caching dashboard: tambahkan invalidate cache dashboard/boq/reconciliation setelah create adjustment (jika pakai SWR/React Query, mutate key terkait).
3. Laporan lama: angka di laporan akan berubah karena sumber `additional` berganti. Komunikasikan perubahan ini ke stakeholder sebelum deploy.
4. Race condition: dua supervisor menambah adjustment bersamaan untuk `(project, barang)` yang sama. Total pengecekan dilakukan di service layer dalam transaksi; serializable isolation cukup atau gunakan `SELECT ... FOR UPDATE`.
5. Hak akses: pastikan endpoint hanya bisa diakses supervisor/admin; tambahkan test otorisasi seperti pola di `backend/src/middlewares/role.middleware.js`.

## 6. Rencana Implementasi

### Langkah 1 — Schema + Migrasi
- Tambah model `additional_adjustment` ke `backend/prisma/schema.prisma`.
- Buat migrasi `npx prisma migrate dev --name add_additional_adjustment`.
- File: `schema.prisma`, file migrasi baru.

### Langkah 2 — Helper hitung + integrasi
- Buat `backend/src/modules/additional/additional.repository.js` (fungsi hitung sum qty).
- Update 4 lokasi: `boq.repository.js`, `dashboard.service.js`, `reconciliation.repository.js`, `reports.repository.js`.
- File: 1 file baru + 4 file modified.

### Langkah 3 — Endpoint + Validasi + Audit
- Buat `backend/src/modules/additional/additional.controller.js`, `additional.service.js`, `additional.validation.js`, `additional.routes.js`.
- Integrasi audit_log di service layer.
- Register route di `backend/src/app.js` atau routes index.
- File: 4 file baru + 1 routes modified.

### Langkah 4 — Frontend
- Update `frontend/app/dashboard/reconciliation/page.tsx` dan `supervisor/reconciliation/page.tsx`.
- Tambah form edit + panel riwayat.
- File: 2 file modified.

### Langkah 5 — Uji
- Unit test service + validasi (cek boundary: qty 0, alasan <5 char, total negatif).
- E2E smoke test endpoint untuk supervisor dan admin.
- File: test baru di `backend/src/modules/additional/`.
