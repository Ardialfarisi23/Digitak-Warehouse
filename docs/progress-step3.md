# Progress Step 3 — Race Condition & Double Deduct Prevention

**Tanggal:** 2026-09-29  
**Branch:** fix/picking-override-flow

---

## Bagian 0 — Verifikasi Step 2

1. **Override dihitung ulang di server dalam transaksi?**  
   Ya. `surat-jalan.service.js:1119` menghitung `isOverride` dari `pickedKondisi !== requestedKondisi`, dan validasi `catatan_kondisi` di line 1121, semuanya di dalam `$transaction` (line 1104).

2. **Kondisi aktual tersimpan di `surat_jalan_item`?**  
   Tidak. Hanya di `audit_log` (`kondisi_diminta`, `kondisi_diambil`, `override`, `catatan_kondisi` di line 1229-1238). Tabel `surat_jalan_item` tidak memiliki kolom kondisi aktual yang di-pick.

3. **`picking_selesai` dicek di dalam transaksi?**  
   Tidak (sebelum Step 3). Hanya dicek di `updateDeliveryStatus`/`confirmDistributed` (luar transaksi retrieve). Di Step 3 ditambahkan guard `ALREADY_PICKED` di awal transaksi retrieve.

---

## Bagian A — Race Condition & Double Deduct

### Opsi yang dipilih: (1) conditional decrement

**Alasan:**  
- `updateMany` dengan `WHERE qty >= deductQty` adalah atomic di database PostgreSQL, mencegah race condition tanpa perlu row lock eksplisit.  
- Lebih ringkas dan sesuai pola Prisma yang sudah dipakai di codebase (lihat `dashboard.service.js`, `return.repository.js`).  
- Row lock (`SELECT ... FOR UPDATE`) butuh `$queryRaw`/raw SQL, lebih invasif dan inconsistent dengan gaya ORM yang dominan.

### Perubahan yang diterapkan

**`backend/src/shared/errors.js`**  
- `AppError` sekarang menerima parameter ketiga `code` untuk error terstruktur.

**`backend/src/middlewares/error.middleware.js`**  
- Response error kini menyertakan `code` jika ada (mis. `ALREADY_PICKED`, `INSUFFICIENT_STOCK`, `NO_STOCK`, `OVERRIDE_REASON_REQUIRED`, `OVERRIDE_NO_STOCK`).

**`backend/src/modules/surat-jalan/surat-jalan.service.js`**
- **Guard submit ganda:** di awal transaksi `retrieve`, cek `shipment.picking_selesai === true` → throw `AppError("Surat jalan ini sudah selesai di-picking.", 400, "ALREADY_PICKED")`.
- **Deduct stok atomik:** ganti `findFirst` + `update`/`delete` dengan `updateMany` + `decrement` + kondisi `qty: { gte: deductQty }`. Jika `count !== 1`, throw `INSUFFICIENT_STOCK`. Setelah itu, `findFirst` untuk dapat `newQty`, lalu delete jika `<= 0`.
- **Pure function:** ekstrak `buildPickDecision()` untuk logika keputusan override/no-stock/insufficient. Fungsi ini murni, tanpa side effect, dan sudah diekspor untuk ditest.

---

## Bagian B — Unit Test

**Framework:** `node:test` + `node:assert` (bawaan Node.js, tanpa dependency baru).  
**Script:** `npm test` → `node --test src/modules/surat-jalan/surat-jalan.service.test.js`

### 6 kasus yang diuji

1. Kondisi sesuai + stok cukup → `ok: true`
2. Override sah dengan alasan → `ok: true`
3. Override tanpa alasan → `code: "OVERRIDE_REASON_REQUIRED"`
4. Kondisi alternatif stok kurang → `code: "OVERRIDE_NO_STOCK"`
5. Qty > stok → `code: "INSUFFICIENT_STOCK"`
6. Tidak ada stok sama sekali → `code: "NO_STOCK"`

### Hasil

```
✔ buildPickDecision (6/6 passed)
```

### Race condition: cara uji manual

1. Siapkan 1 SJ outbound dengan item yang stok marginal (mis. qty=5).
2. Buka 2 browser/incognito, login sebagai staff berbeda.
3. Keduanya buka halaman picking, pilih zona yang sama, submit retrieve bersamaan.
4. Yang pertama harus berhasil, yang kedua harus dapat error `INSUFFICIENT_STOCK` (bukan double deduct atau minus stok).
5. Verifikasi di database: `stok_gudang.qty` akhir harus 0 (jika awal 5, dibutuhkan 5), dan `stok_ledger` harus ada 1 record saja.

---

## Verifikasi

- **npm test:** 6/6 passed.
- **Syntax check backend:** lolos (`node -c` pada file yang diubah).
- **TypeScript frontend:** tidak diubah di step ini.

---

## File yang diubah

- `backend/src/shared/errors.js` — tambah parameter `code` di `AppError`.
- `backend/src/middlewares/error.middleware.js` — sertakan `code` di response JSON.
- `backend/src/modules/surat-jalan/surat-jalan.service.js` — guard `ALREADY_PICKED`, atomic deduct via `updateMany` + `decrement`, ekstrak `buildPickDecision`.
- `backend/src/modules/surat-jalan/surat-jalan.service.test.js` — 6 unit test untuk `buildPickDecision`.
- `backend/package.json` — tambah script `test`.

---

## Commit

```
806a2c7 fix: prevent race condition and double deduct in retrieve
```

**Catatan untuk step berikutnya:**  
- Override masih hanya tercatat di `audit_log`. Perlu keputusan apakah perlu kolom di `surat_jalan_item` (berarti migration).  
- Partial picking belum diimplementasi.
