# DIAGNOSA STEP 1 — Rekonsiliasi Inventory: Upload Mitra Gagal Meski Tiket Ada di Tabel

## Ringkasan masalah
Upload file Excel untuk tiket TKT-SI-2026-0149 menghasilkan “Kode Tiket tidak terdaftar” meski tiket yang sama tampil di tabel “Daftar Rekonsiliasi” halaman yang sama. Ada dua jalur data berbeda: tabel menggunakan `boq_item → boq → tiket_material`, sedangkan validasi upload melakukan lookup langsung ke `tiket_material` dengan filter nested `boq` (one-to-one). Perbedaan cara Prisma memperlakukan `where` pada relasi one-to-one vs many-to-one menjadi penyusutan utama.

## Peta alur
1. **Frontend modal** — `frontend/app/dashboard/reconciliation/page.tsx:316` (`handleMitraUpload`) membuat `FormData` dan POST ke `/api/reports/reconciliation/upload`.
2. **Route** — `backend/src/modules/reports/reports.routes.js:23` memetakan POST ke `reportsController.uploadReconciliationFile`.
3. **Multer** — `backend/src/modules/reports/reports.controller.js:258-292` menyimpan file ke disk.
4. **Parser XLSX** — `backend/src/modules/reports/reports.controller.js:310-313` membaca file dengan `XLSX.readFile` + `sheet_to_json`.
5. **Validasi kolom** — `backend/src/modules/reports/reports.controller.js:320-329` memeriksa header sesuai `RECONCILIATION_REQUIRED_COLUMNS`.
6. **Lookup tiket** — `backend/src/modules/reports/reports.controller.js:331-380` query `prisma.tiket_material.findMany` dengan nested `boq.where` lalu membuat `Map` untuk lookup exact match.
7. **Error** — `backend/src/modules/reports/reports.controller.js:376-379` jika `Map.get()`返回 `undefined` → `"Kode Tiket tidak terdaftar"`.

## Perbedaan jalur data tabel vs validasi upload
| Aspek | Tabel “Daftar Rekonsiliasi” | Validasi Upload |
|---|---|---|
| **Endpoint** | `GET /api/reconciliation/inventory` | `POST /api/reports/reconciliation/upload` |
| **Query utama** | `prisma.boq_item.findMany` dengan `where.boq.status` + `where.boq.source` | `prisma.tiket_material.findMany` dengan nested `select.boq.where.status` |
| **Relasi yang difilter** | `boq_item` (many-to-one ke `boq`) — `where` memfilter **baris boq_item**, tiket ikut terbawa karena JOIN | `tiket_material` (one-to-one ke `boq`) — `where` pada nested one-to-one berpotensi memfilter **parent tiket_material** |
| **Filter tambahan** | `boq.source = "top_down"` | Tidak ada filter `source` |
| **Cara akses tiket** | Melalui `boq → tiket` | Langsung dari `tiket_material` |
| **Match kode tiket** | Tidak ada exact-match Map, hanya display | `Map` dengan `String(kodeTiket).trim()` (exact, case-sensitive) |

### Dampak perbedaan
- Pada Prisma, `where` di dalam nested query untuk relasi **one-to-one** (seperti `tiket_material.boq`) dapat berperilaku seperti INNER JOIN yang menyaring record parent jika related record tidak match.
- Pada relasi **many-to-one** (seperti `boq_item.boq`), `where` hanya menyaring record `boq_item`, bukan record `boq` itu sendiri.
- Jika BOQ tiket memiliki status valid untuk tabel (karena tabel menggunakan jalur `boq_item`), tapi Prisma one-to-one `where` di upload menganggap tidak ada match, tiket akan hilang dari `tiketMap`.

## Logika penentu “tidak terdaftar”
1. **Kapan status diberikan** — Hanya saat `tiketMap.get()`返回 `undefined` (line 376). Tidak ada try-catch yang menelan error; kegagalan lain seperti barang tidak terdaftar memakai reason berbeda.
2. **Normalisasi kode** — Hanya `String(kodeTiket).trim()` (line 376). Tidak ada uppercase, tidak ada penghapusan non-breaking space/zero-width char. Jika DB menyimpan nilai dengan whitespace non-ASCII atau case berbeda, match gagal.
3. **Mapping kolom XLSX** — Bergantung pada header persis: `Kode Tiket` / `kode_tiket` / `KODE_TIKET`. Jika header berbeda sedikit (mis. “Kode_Tiket”), missingColumns akan menangkapnya sebelum lookup. Kolom PROJECT/NAMA BARANG/USED/KONDISI kosong di preview menandakan baris gagal di level tiket, bukan di level barang.
4. **Lookup kunci tambahan** — Tidak ada. Upload hanya lookup berdasarkan `kode_tiket` saja (line 376). Barang dicari terpisah setelah tiket ditemukan.
5. **Error ditelan catch** — `catch (parseErr)` hanya untuk error parsing file (line 436). Kegagalan lookup tiket BUKAN exception, tapi normal flow → tidak ditelan.

## Hipotesis penyebab utama
| # | Hipotesis | Bukti path:baris | Keyakinan |
|---|---|---|---|
| 1 | Prisma `where` pada nested one-to-one `boq` memfilter parent `tiket_material`. Tiket dengan BOQ status valid tetap punya BOQ, tapi query `findMany` dengan `select.boq.where` tidak mengembalikannya karena Prisma menghasilkan INNER JOIN untuk one-to-one. | `backend/src/modules/reports/reports.controller.js:343-352` (nested `boq.where` dalam `select`) vs `backend/src/modules/reconciliation/reconciliation.repository.js:89-101` (`boq_item` many-to-one `where.boq`) | **Tinggi** |
| 2 | `kode_tiket` di database memiliki whitespace non-ASCII (non-breaking space, zero-width) atau case berbeda yang tidak terlihat di tabel karena frontend tidak melakukan trim/uppercase pada display. | `backend/src/modules/reports/reports.controller.js:376` (`String(kodeTiket).trim()` hanya ASCII) vs `frontend/app/dashboard/reconciliation/page.tsx:228` (display `item.kode_tiket` tanpa transformasi) | **Sedang** |
| 3 | Parser XLSX mengembalikan nilai `kode_tiket` sebagai objek (rich text/formula) sehingga `String()` menghasilkan string tidak terduga. | `backend/src/modules/reports/reports.controller.js:310-313` (`XLSX.readFile` + `sheet_to_json` default) dan line 364 (`row["Kode Tiket"]`) | **Rendah** |

## Query/cek verifikasi manual
```sql
-- 1. Cek exact kode_tiket di tiket_material
SELECT tiket_id, kode_tiket, length(kode_tiket) as len, encode(convert_to(kode_tiket, 'UTF8'), 'hex') as hex
FROM tiket_material
WHERE lower(kode_tiket) = lower('TKT-SI-2026-0149');

-- 2. Cek apakah ada BOQ untuk tiket tersebut dan statusnya
SELECT b.boq_id, b.status, b.source, b.tiket_id
FROM boq b
JOIN tiket_material tm ON tm.tiket_id = b.tiket_id
WHERE lower(tm.kode_tiket) = lower('TKT-SI-2026-0149');

-- 3. Cek apakah tiket_material punya boq (left join)
SELECT tm.kode_tiket, b.boq_id, b.status
FROM tiket_material tm
LEFT JOIN boq b ON b.tiket_id = tm.tiket_id
WHERE lower(tm.kode_tiket) = lower('TKT-SI-2026-0149');

-- 4. Cek apakah ada unique constraint pada boq.tiket_id
SELECT cu.conname, cu.conrelid::regclass, cu.confrelid::regclass
FROM pg_constraint cu
JOIN pg_class c ON c.oid = cu.conrelid
WHERE c.relname = 'boq' AND cu.contype = 'u';
```

## Saran console.log sementara
 Tambahkan di `backend/src/modules/reports/reports.controller.js` setelah line 356:
```javascript
console.log('DEBUG tikets count:', tikets.length);
console.log('DEBUG kode_tiket from xlsx:', JSON.stringify(kodeTiket));
console.log('DEBUG tiketMap keys:', [...tiketMap.keys()].slice(0, 5));
```

## Rencana perbaikan disarankan
1. **Ubah query lookup tiket** — Ganti `findMany` dengan nested `boq.where` menjadi dua langkah: (a) query `tiket_material` tanpa filter `boq`, (b) filter manual di JS berdasarkan `boq.status` dari hasil query. Atau gunakan `$queryRaw` untuk full kontrol SQL. Perkiraan: ubah ~15 baris di `backend/src/modules/reports/reports.controller.js:331-380`.
2. **Normalisasi kode tiket** — Tambahkan uppercase dan hapus non-breaking space/zero-width char saat lookup: `kodeTiket.normalize('NFKC').toUpperCase().replace(/\s/g, '')`. Perkiraan: ubah 1 baris di line 376.
3. **Fallback lookup** — Jika `Map` tidak ketemu, lakukan fallback `findUnique` dengan `contains` + `mode: insensitive` seperti di `reports.repository.js:824`. Perkiraan: tambahkan ~5 baris setelah line 376.

## Hal yang belum diketahui / butuh input
1. Apakah tiket TKT-SI-2026-0149 memiliki **persis satu** record `boq` dengan `status` dalam ["draft","aktif","selesai"] dan `source = "top_down"`?
2. Value `kode_tiket` yang tersimpan di database exactnya apa (termasuk whitespace/hex)?
3. Apakah ada kemungkinan user lain yang sedang mengubah BOQ status secara bersamaan saat upload?
4. Header kolom di file xlsx yang di-upload exactnya apa (untuk memastikan parser tidak salah baca)?
