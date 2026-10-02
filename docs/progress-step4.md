# Progress Step 4 — Atomic Claim & Pick Actual Table

**Tanggal:** 2026-09-29  
**Branch:** fix/picking-override-flow

---

## Bagian A — Klaim Atomik

### Perubahan

**`backend/src/modules/surat-jalan/surat-jalan.repository.js`**
- Tambah fungsi `claimPicking(id, tx)` yang melakukan `updateMany` dengan `where: { surat_jalan_id, picking_selesai: false }` dan mengembalikan `true` jika exactly 1 row ter-update.

**`backend/src/modules/surat-jalan/surat-jalan.service.js`**
- Ganti guard baca-lalu-cek (`if (shipment.picking_selesai === true)`) dengan `claimPicking` di awal `$transaction`.
- Hapus duplikasi `updateStatus(..., { picking_selesai: true })` di akhir transaksi, karena klaim sudah dilakukan di awal.

### Path:baris
- `surat-jalan.service.js:1163-1168` — klaim atomik di awal transaksi.
- `surat-jalan.service.js:1303` — duplikasi `picking_selesai` di akhir transaksi dihapus.

### Cara uji manual
1. Siapkan 1 SJ outbound dengan stok cukup.
2. Kirim 2 request `POST /api/surat-jalan/{id}/retrieve` bersamaan (parallel curl/Postman).
3. Yang pertama harus dapat `200` + `picking_selesai: true`.
4. Yang kedua harus dapat `400` dengan `code: "ALREADY_PICKED"`.
5. Verifikasi di DB: `stok_gudang.qty` terpotong sekali, `surat_jalan_item_pick` punya 1 row per item.

---

## Bagian B — Tabel `surat_jalan_item_pick`

### Model Baru

**`backend/prisma/schema.prisma`** — tambah model `surat_jalan_item_pick`:
```prisma
model surat_jalan_item_pick {
  pick_id              BigInt           @id @default(autoincrement())
  surat_jalan_item_id  BigInt
  gudang_id            BigInt
  zona_id              BigInt?
  kondisi_diminta      kondisi_barang
  kondisi_diambil      kondisi_barang
  qty                  Decimal          @db.Decimal(14, 2)
  is_override          Boolean          @default(false)
  catatan_override     String?          @db.Text
  picked_by            BigInt?
  picked_at            DateTime         @default(now())

  @@index([surat_jalan_item_id])
}
```

### Migration
**`backend/prisma/migrations/20260929000000_add_surat_jalan_item_pick/migration.sql`**
- Hanya `CREATE TABLE` + `CREATE INDEX`.
- Tidak ada `DROP`/`ALTER` pada tabel lama.

### Integrasi di Retrieve
**`backend/src/modules/surat-jalan/surat-jalan.service.js:1278-1290`**
- Setelah deduct stok berhasil, insert 1 baris ke `surat_jalan_item_pick` via `mapPickRow()`.
- `mapPickRow()` diekspor untuk ditest.

### Unit Test
- `mapPickRow`: 2 kasus (normal pick, override pick).
- Total tests: 8/8 passed.

---

## Verifikasi

- **npm test:** 8/8 passed.
- **Syntax check backend:** lolos.
- **prisma validate:** schema valid.
- **Migration SQL:** hanya CREATE TABLE + INDEX, tidak ada DROP/ALTER tabel lama.

---

## File yang diubah

- `backend/src/modules/surat-jalan/surat-jalan.repository.js` — tambah `claimPicking`.
- `backend/src/modules/surat-jalan/surat-jalan.service.js` — klaim atomik, insert `surat_jalan_item_pick`, ekstrak `mapPickRow`.
- `backend/src/modules/surat-jalan/surat-jalan.service.test.js` — tambah test `mapPickRow`.
- `backend/prisma/schema.prisma` — tambah model `surat_jalan_item_pick`.
- `backend/prisma/migrations/20260929000000_add_surat_jalan_item_pick/migration.sql` — migration baru.

---

## Catatan

- Migration belum di-apply ke DB dev karena drift detection di `prisma migrate dev`. File migration sudah ditulis manual dan sudah divalidasi SQL-nya.
- Untuk apply migration ke dev, jalankan: `npx prisma migrate dev --name add-surat-jalan-item-pick` setelah resolve drift, atau `npx prisma db push` untuk dev-only.
