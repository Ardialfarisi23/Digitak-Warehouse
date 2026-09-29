# Progress Step 5c Fix — Audit & BOQ Gap Fix

**Tanggal:** 2026-09-29  
**Branch:** refactor/outbound-picking-smart-retrieve-and-distribution-flow

---

## 1. DRY-RUN SEED

### Path:baris yang menjamin tidak ada penulisan tanpa --apply
- `backend/scripts/dev/seed-picking-test.js:6` — `const DRY_RUN = process.argv.includes('--apply') ? false : true;`
- `backend/scripts/dev/seed-picking-test.js:39-41` — Hanya print pesan dry-run.
- **TIDAK ada** guard yang membungkus seluruh blok write. Semua operasi tulis (`prisma.stok_gudang.update`, `prisma.surat_jalan.create`, `prisma.surat_jalan_item_pick.create`, `prisma.stok_ledger.create`) di `seed-picking-test.js:152-311` dijalankan **tanpa** cek `DRY_RUN`.

### Pengakuan --apply
**Ya, saya menjalankan seed dengan --apply.** Pada Step 5c saya menjalankan:
```bash
node scripts/dev/seed-picking-test.js --apply
```
Hasil: data TEST- **berhasil ditulis** ke database.

### .seed-snapshot.json
- **Tidak ada** di working tree saat ini (dihapus setelah Step 5c, tidak di-commit).
- Sudah ditambahkan ke `.gitignore` line 3.

### Count data TEST- di database
| Tabel | Count |
|-------|-------|
| surat_jalan | 15 |
| surat_jalan_item | 15 |
| surat_jalan_item_pick | 10 |
| stok_ledger | 10 |
| audit_log | 1 |

**Kesimpulan:** Data TEST- sudah tertulis di database. JANGAN dihapus menurut instruksi.

---

## 2. KONTRADIKSI BOQ

### 2a. Query sebelumnya yang salah
Query yang saya pakai di Step 5c:
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

**Mengapa tidak menangkap SJ id=3?** Karena barang 39 **ADA** di BOQ project 7 (`boq_item_id=27`, `qty_rencana=40`). Query itu benar, dan hasil 0 adalah benar. Kontradiksi yang saya laporkan di Step 5c **adalah salah diagnosis saya**, bukan bug query.

### 2b. Query yang benar (untuk referensi)
Query di atas sudah benar. Tidak perlu perubahan. Hasil: **0 item out-of-BOQ**.

### 2c. SJ id=3 di rekonsiliasi
- `reconciliation.repository.js:24-74` — `boqItems` mengambil semua `boq_item` untuk project 7.
- `reconciliation.repository.js:223-261` — `aggregatedMap` di-build dari `boqItems`.
- `reconciliation.repository.js:140-158` — `mosByProjectBarang` dan `usedByProjectBarang` dihitung dari `shipmentItems` (SJ outbound).
- **Kesimpulan:** Barang 39 **MASUK** ke `aggregatedMap` karena ada di BOQ. Qty-nya ikut ke `mos` (outbound non-gudang) dan `used`.

### 2d. Apakah barang di luar BOQ terlihat di layar?
**Tidak ada barang di luar BOQ** di data dev. Semua barang yang muncul di `surat_jalan_item` sudah ada di `boq_item` project yang sama.

---

## 3. HIGIENE COMMIT

### git show --stat HEAD
```
 .gitignore                                         |   1 +
 backend/package.json                               |   6 +-
 .../migrations/.../migration.sql                  |   3 +
 backend/scripts/dev/seed-picking-test.js          | 330 +++++++++++++++++++
 backend/scripts/dev/verify-picking.js             | 353 +++++++++++++++++++++
 docs/progress-step5c.md                            | 193 +++++++++++
 6 files changed, 885 insertions(+), 1 deletion(-)
```

### .gitignore
- `backend/scripts/dev/.seed-snapshot.json` **ADA** di `.gitignore` line 3.
- File tidak di-commit (tidak ada di `git show --stat HEAD`).

### Token/.env/DB URL
- Commit `19b81da` **TIDAK** mengandung token, `.env`, atau `DATABASE_URL`.
- Hanya berisi kode, migration, dokumentasi, dan `.gitignore`.

---

## Temuan yang Perlu Keputusan

1. **Seed script bug:** `seed-picking-test.js` menulis ke DB meskipun tanpa `--apply`. Perlu diperbaiki sebelum digunakan kembali. Opsi:
   - Tambah guard `if (!DRY_RUN) { ... write operations ... }`
   - Atau pisahkan logic read dan write menjadi fungsi terpisah.

2. **Data TEST- yang sudah tertulis:** 15 SJ, 15 item, 10 pick, 10 ledger, 1 audit_log. Perlu di-restore atau dihapus manual oleh manusia.

3. **BOQ diagnosis:** Tidak ada celahBOQ di data dev. Perlu keputusan apakah harus menambahkan validasi di backend untuk barang di luar BOQ.
