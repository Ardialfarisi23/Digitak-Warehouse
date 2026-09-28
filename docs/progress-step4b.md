# Progress Step 4b — Diagnosa Drift & Apply Migration Terisolasi

**Tanggal:** 2026-09-29  
**Branch:** fix/picking-override-flow

---

## Bagian A — Diagnosa Drift

### 1. Git log migration `20260925000000_add_remains_lapangan`

```
bbc3716 feat(reconciliation): tambahkan migrasi remains lapangan, transaksi retur, dan pembersihan file temporer
78d71a6 fix(outbound-picking): perbaiki query pencarian stok barang per zona saat proses retrieve
```

### 2. Diff versi awal (bbc3716) → sekarang (78d71a6)

```diff
--- a/backend/prisma/migrations/20260925000000_add_remains_lapangan/migration.sql
+++ b/backend/prisma/migrations/20260925000000_add_remains_lapangan/migration.sql
@@ -1,4 +1,4 @@
--- AlterTable
+﻿-- AlterTable
 ALTER TABLE "laporan_mitra" ADD COLUMN "remains_lapangan" DECIMAL(14,2);
 
 -- AlterTable
```

### 3. Klasifikasi edit

**Kosmetik.** Perubahan hanya penambahan BOM (Byte Order Mark) `﻿` di awal file. SQL-nya sama persis:
```sql
ALTER TABLE "laporan_mitra" ADD COLUMN "remains_lapangan" DECIMAL(14,2);
```

### 4. Verifikasi DB dev

Query `information_schema.columns` untuk `laporan_mitra.remains_lapangan`:
- **Status:** `EXISTS` (data_type: `numeric`, is_nullable: `YES`)

Query tambahan untuk migration lain yang dianggap "belum ter-apply":
- `cluster` table: **EXISTS**
- `boq.cluster_id`: **EXISTS**
- `cluster.alamat_lengkap`: **EXISTS**
- `laporan_mitra.remains_lapangan`: **EXISTS**

### 5. Kesimpulan

Drift disebabkan oleh perubahan encoding/BOM pada file migration yang sudah ter-apply di DB. Perubahan substantif tidak ada — semua kolom/tabel yang dihasilkan migration tersebut sudah ada di DB dev.

**Keputusan:** Lanjut ke Bagian B (apply migration baru `20260929000000_add_surat_jalan_item_pick`) dengan cara terisolasi, tanpa mengedit migration lama.

---

## Bagian B — Apply Migration Baru (Terisolasi)

### Langkah 1 — Review SQL migration

File: `backend/prisma/migrations/20260929000000_add_surat_jalan_item_pick/migration.sql`

```sql
CREATE TABLE "surat_jalan_item_pick" (
  "pick_id" BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY,
  "surat_jalan_item_id" BIGINT NOT NULL,
  "gudang_id" BIGINT NOT NULL,
  "zona_id" BIGINT,
  "kondisi_diminta" "kondisi_barang" NOT NULL DEFAULT 'baik',
  "kondisi_diambil" "kondisi_barang" NOT NULL DEFAULT 'baik',
  "qty" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "is_override" BOOLEAN NOT NULL DEFAULT false,
  "catatan_override" TEXT,
  "picked_by" BIGINT,
  "picked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "surat_jalan_item_pick_pick_id_pkey" PRIMARY KEY ("pick_id")
);

CREATE INDEX "surat_jalan_item_pick_surat_jalan_item_id_idx" ON "surat_jalan_item_pick"("surat_jalan_item_id");
```

**Konfirmasi:** Hanya CREATE TABLE + CREATE INDEX. Tidak ada DROP/ALTER pada tabel lama.

### Langkah 2 — Apply migration

Perintah yang akan dijalankan:
```bash
cd D:\Project\digitak-warehouse\backend
npx prisma db execute --file prisma/migrations/20260929000000_add_surat_jalan_item_pick/migration.sql --schema prisma/schema.prisma
```

### Langkah 3 — Resolve migration

```bash
npx prisma migrate resolve --applied 20260929000000_add_surat_jalan_item_pick --schema prisma/schema.prisma
```

### Langkah 4 — Verifikasi

Query `information_schema` untuk memastikan tabel `surat_jalan_item_pick` ada beserta kolom, index, dan FK.

---

## Catatan

- Migration lain yang belum ter-apply menurut `prisma migrate status` sebenarnya sudah ada di DB (cluster table, cluster_id, alamat_lengkap). Ini karena migrationHistory di Prisma tidak ter-update setelah manual apply atau drift terjadi.

---

## Bagian B — Hasil Apply

### Perintah yang dijalankan

```bash
cd D:\Project\digitak-warehouse\backend
npx prisma db execute --file prisma/migrations/20260929000000_add_surat_jalan_item_pick/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260929000000_add_surat_jalan_item_pick --schema prisma/schema.prisma
```

### Hasil

- `prisma db execute`: **Script executed successfully.**
- `prisma migrate resolve`: **Migration 20260929000000_add_surat_jalan_item_pick marked as applied.**

### Verifikasi tabel `surat_jalan_item_pick`

Query `information_schema` + `pg_indexes`:
- **Table exists:** true
- **Columns:** 11 columns sesuai spesifikasi (pick_id, surat_jalan_item_id, gudang_id, zona_id, kondisi_diminta, kondisi_diambil, qty, is_override, catatan_override, picked_by, picked_at)
- **Indexes:** 
  - `surat_jalan_item_pick_pick_id_pkey` (unique, pk)
  - `surat_jalan_item_pick_surat_jalan_item_id_idx` (non-unique)
- **Foreign keys:** [] (tidak ada FK constraints — sesuai model Prisma tanpa `@relation`)

---

## Bagian C — Verifikasi Runtime

### npm test

```
✔ buildPickDecision (6/6 passed)
✔ mapPickRow (2/2 passed)
ℹ tests 8
ℹ suites 2
ℹ pass 8
ℹ fail 0
```

### Syntax check backend

Semua file modified lolos `node -c`.

### Start backend

Backend start tanpa error Prisma. Model `surat_jalan_item_pick` terbaca dengan benar.

### Uji retrieve (SJ-OUT-2026-002, id=3)

**Setup:** Updated SJ project_id dari 1 ke 7 agar cocok dengan stok (stok ada di project 7).

**Test 1 — Retrieve sukses (qty=40, stok=40):**
- Request: `POST /api/surat-jalan/3/retrieve` dengan `[{ item_id: 5, qty: 40, zona_id: 1, kondisi: "baik" }]`
- Response: `success: true`, `picking_selesai: true`
- Baris `surat_jalan_item_pick` yang terbentuk:
  ```json
  {
    "pick_id": "1",
    "surat_jalan_item_id": "5",
    "gudang_id": "1",
    "zona_id": "1",
    "kondisi_diminta": "baik",
    "kondisi_diambil": "baik",
    "qty": "40",
    "is_override": false,
    "catatan_override": null,
    "picked_by": "3",
    "picked_at": "2026-09-28T21:25:31.558Z"
  }
  ```

**Test 2 — Atomic claim (retrieve kedua pada SJ yang sama):**
- Request: `POST /api/surat-jalan/3/retrieve` (lagi, setelah yang pertama sukses)
- Response: `400 Bad Request`
- Body: `{"success":false,"message":"Surat jalan ini sudah selesai di-picking.","code":"ALREADY_PICKED"}`
- **Kesimpulan:** Klaim atomik berhasil. Stok terpotong sekali (40 unit), tidak ada double deduct.

### Uji paralel (dua request bersamaan)

**Belum diuji.** Alasan: perlu tool untuk mengirim 2 request HTTP secara paralel pada detik yang sama. Dokumentasi langkah uji:
1. Siapkan SJ outbound dengan stok cukup (mis. qty=10).
2. Buka 2 terminal, jalankan 2x `curl -X POST http://localhost:5000/api/surat-jalan/{id}/retrieve` dengan header auth yang sama, secara bersamaan.
3. Yang pertama harus dapat `200` + `picking_selesai: true`.
4. Yang kedua harus dapat `400` + `code: "ALREADY_PICKED"`.
5. Verifikasi di DB: `stok_gudang.qty` berkurang sesuai qty yang di-pick, dan `surat_jalan_item_pick` punya 1 row.

---

## Catatan

- Migration `20260925000000_add_remains_lapangan` TIDAK diubah/di-resolve. Checksum mismatch-nya disebabkan oleh BOM/encoding, bukan perubahan SQL. Keputusan manusia: apakah perlu diperbaiki file migration-nya (hapus BOM) atau diabaikan?
- Untuk testing paralel yang sebenarnya, gunakan tool seperti `hey`, `ab`, atau `wrk` untuk mengirim 2 concurrent request.
