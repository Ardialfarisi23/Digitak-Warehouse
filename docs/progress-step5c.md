# Progress Step 5c — Test Script, BOQ Gap, DROP DEFAULT, Dev Tooling

**Tanggal:** 2026-09-29  
**Branch:** refactor/outbound-picking-smart-retrieve-and-distribution-flow

---

## 0. Test Script

- **Sebelum:** `npm test` menjalankan 1 file (`surat-jalan.service.test.js`), 8 tests.
- **Sesudah:** `npm test` menjalankan semua `*.test.js` di `src/modules/**/*.test.js` dan `src/**/*.test.js`, **13 tests** (8 + 5).
- Perubahan di `backend/package.json` line 9.

---

## A. Celah BOQ

### Pertanyaan
Apakah daftar item rekonsiliasi berasal dari `boq_item` saja atau gabungan? Ke mana barang di `surat_jalan_item` yang tidak ada di BOQ project itu?

### Jawaban
Daftar item rekonsiliasi berasal dari **`boq_item` saja** (`reconciliation.repository.js:223-261`).  
Barang di `surat_jalan_item` yang tidak ada di BOQ project:
- **Tidak masuk** ke `aggregatedMap` (tidak ada row rekonsiliasi untuk barang tersebut).
- Tapi qty-nya **masih dihitung** di `mosByProjectBarang` / `usedByProjectBarang` (`reconciliation.repository.js:140-158`).

### Query
```sql
SELECT count(*) AS count
FROM surat_jalan_item sji
JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
WHERE sj.picking_selesai = true
  AND sj.status IN ('disetujui', 'diterima_didistribusikan')
  AND NOT EXISTS (
    SELECT 1 FROM boq_item bi
    JOIN boq b ON bi.boq_id = b.boq_id
    JOIN tiket_material tm ON b.tiket_id = tm.tiket_id
    WHERE bi.barang_id = sji.barang_id
      AND tm.project_id = sj.project_id
      AND b.source = 'top_down'
      AND b.status IN ('draft', 'aktif', 'selesai')
  );
```

### Hasil Query
**0 item** di DB dev yang barangnya tidak ada di BOQ project-nya. Semua SJ dengan `picking_selesai=true` sudah memiliki barang yang tercantum di BOQ.

### Kesimpulan
Tidak ada celahBOQ di data dev saat ini. Secara kode, barang di SJ yang tidak ada di BOQ:
- Tidak menghasilkan row rekonsiliasi.
- Tapi tetap menambah MOS/used.

**Klasifikasi:** Tidak jelas (bisa disengaja untuk tracking out-of-BOQ, atau celah jika harus diabaikan).

---

## B. DROP DEFAULT Migration

### Column Defaults di DB (`information_schema.columns`)
| Kolom | Default di DB | Ada @default di schema? |
|-------|---------------|------------------------|
| kondisi_diminta | `'baik'::kondisi_barang` | Tidak |
| kondisi_diambil | `'baik'::kondisi_barang` | Tidak |
| qty | `0` | Tidak |
| is_override | `false` | Ya (`@default(false)`) |
| picked_at | `CURRENT_TIMESTAMP` | Ya (`@default(now())`) |

### Migration File
**Path:** `backend/prisma/migrations/20260929000002_drop_defaults_surat_jalan_item_pick/migration.sql`

```sql
ALTER TABLE "surat_jalan_item_pick" ALTER COLUMN "kondisi_diminta" DROP DEFAULT;
ALTER TABLE "surat_jalan_item_pick" ALTER COLUMN "kondisi_diambil" DROP DEFAULT;
ALTER TABLE "surat_jalan_item_pick" ALTER COLUMN "qty" DROP DEFAULT;
```

**Belum di-apply.** Cara apply oleh manusia:
```bash
cd D:\Project\digitak-warehouse\backend
npx prisma db execute --file prisma/migrations/20260929000002_drop_defaults_surat_jalan_item_pick/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260929000002_drop_defaults_surat_jalan_item_pick --schema prisma/schema.prisma
```

### Konfirmasi Retrieve
Retrieve selalu mengisi `kondisi_diminta`, `kondisi_diambil`, `qty` secara eksplisit:
- `surat-jalan.service.js:1304-1315` — `mapPickRow` dengan `requestedKondisi`, `pickedKondisi`, `qty`.

---

## C. Dev Tooling

### File yang Dibuat
1. `backend/scripts/dev/seed-picking-test.js` — Seed data test picking
2. `backend/scripts/dev/verify-picking.js` — Verify picking flow

### Script npm
Ditambahkan ke `backend/package.json`:
- `npm run seed:picking:test` — Dry-run (tanpa --apply)
- `npm run seed:picking:test:apply` — Jalankan dengan --apply
- `npm run seed:picking:test:restore` — Restore stok ke snapshot
- `npm run verify:picking` — Verify picking flow

### Hasil Dry-run
```
[INFO] Dry-run mode. Tambahkan --apply untuk menulis ke database.
[INFO] Mencari project dan gudang...
[INFO] Project: FTTH Rancamanyar Tahap 1 (1)
[INFO] Gudang: Gudang Ciamis (2), Zona: Zona C (7)
[INFO] Menyiapkan stok...
[INFO] Membuat SJ test...
[INFO] Snapshot tersimpan di:
[INFO]
[INFO] SJ yang dibuat:
[INFO]   - TEST-SJ-A-... (item 88): barang 35, qty 10, kondisi_diminta=baik, kondisi_diambil=baik, override=false
[INFO]   - TEST-SJ-B-... (item 89): barang 6, qty 10, kondisi_diminta=baik, kondisi_diambil=rusak_ringan, override=true
[INFO]   - TEST-SJ-C-... (item 90): barang 6, qty 10, kondisi_diminta=baik, kondisi_diambil=baik, override=false
[INFO]
[INFO] DRY-RUN: Tidak ada yang diubah. Jalankan dengan --apply untuk membuat data test.
```

### Hasil Uji Guard
```
ERROR: Script hanya boleh dijalankan jika DATABASE_URL menunjuk ke localhost/127.0.0.1.
Script rejected as expected
```
Guard berhasil menolak eksekusi dengan DATABASE_URL non-lokal.

---

## Urutan Perintah untuk Manusia

1. **Seed data test (dry-run):**
   ```bash
   cd D:\Project\digitak-warehouse\backend
   npm run seed:picking:test
   ```

2. **Seed data test (apply):**
   ```bash
   npm run seed:picking:test:apply
   ```

3. **Verify picking (normal):**
   ```bash
   $env:TOKEN="<token-staff>"
   $env:SJ_ID="<id-sj-a>"
   $env:MODE="normal"
   npm run verify:picking
   ```

4. **Verify picking (override):**
   ```bash
   $env:TOKEN="<token-staff>"
   $env:SJ_ID="<id-sj-b>"
   $env:MODE="override"
   npm run verify:picking
   ```

5. **Verify picking (parallel):**
   ```bash
   $env:TOKEN="<token-staff>"
   $env:SJ_ID="<id-sj-c>"
   $env:MODE="parallel"
   npm run verify:picking
   ```

6. **Dengan rekonsiliasi:**
   ```bash
   $env:TOKEN="<token-staff>"
   $env:SJ_ID="<id-sj-a>"
   $env:MODE="normal"
   $env:BASE_URL="http://localhost:5000"
   npm run verify:picking -- --recon
   ```

7. **Restore stok:**
   ```bash
   npm run seed:picking:test:restore
   ```

8. **Apply DROP DEFAULT migration:**
   ```bash
   npx prisma db execute --file prisma/migrations/20260929000002_drop_defaults_surat_jalan_item_pick/migration.sql --schema prisma/schema.prisma
   npx prisma migrate resolve --applied 20260929000002_drop_defaults_surat_jalan_item_pick --schema prisma/schema.prisma
   ```

---

## Belum Selesai

- DROP DEFAULT migration belum di-apply.
- verify-picking.js belum diuji dengan backend yang berjalan (perlu TOKEN dan SJ_ID valid).
- restore belum diuji.
