# Diagnosa: Kolom "Asal" kosong di Tab Riwayat Stok

## Ringkasan

Kolom "Asal → Tujuan" di Tab Riwayat Stok menampilkan `gudang_asal` dan `gudang_tujuan` yang diambil dari relasi `surat_jalan` melalui `surat_jalan_item`. Kedua kolom ini bersifat nullable di model `surat_jalan`, sehingga untuk transaksi INBOUND dari pemasok eksternal atau OUTBOUND tanpa gudang asal yang terdefinisi, kolom akan menampilkan "-". Tidak ada fallback turunan di backend atau frontend.

## Alur data: tulis -> baca -> render

1. **Tulis**: `stok_ledger.create()` dipanggil di beberapa modul (`surat-jalan.service.js`, `surat-jalan.repository.js`, `return.repository.js`). Semua panggilan mengisi `surat_jalan_item_id` (nullable), tetapi `stok_ledger` TIDAK punya kolom `gudang_asal_id`/`gudang_tujuan_id` sendiri.
2. **Baca**: `reports.repository.js:getStockHistory()` query `stok_ledger` dengan `include: { surat_jalan_item: { include: { surat_jalan: { include: { gudang_asal, gudang_tujuan }}}}}`. `gudangAsal` dan `gudangTujuan` diambil dari `suratJalan?.gudang_asal?.nama_gudang` (baris 484-485). Tidak ada fallback jika null.
3. **Render**: `TabRiwayatStok` di `page.tsx:1329-1331` menampilkan `r.gudang_asal` dan `r.gudang_tujuan`. Jika "-", tampil dengan warna abu-abu muda (text-slate-300). Modal detail di baris 1423-1431 juga menampilkan nilai yang sama.

## Tabel penulisan data

| Lokasi (path:baris) | Tipe transaksi | asal diisi? | Nilai |
|---------------------|----------------|-------------|-------|
| `surat-jalan.service.js:1163` | OUTBOUND (pengambilan stok) | Tidak | `surat_jalan_item_id` diisi, `gudang_asal` tergantung `surat_jalan.gudang_asal_id` |
| `surat-jalan.service.js:1204` | INBOUND (penerimaan) | Tidak | `surat_jalan_item_id` diisi, `gudang_tujuan` tergantung `surat_jalan.gudang_tujuan_id` |
| `surat-jalan.service.js:1444` | OUTBOUND (pengurangan stok zona) | Tidak | `surat_jalan_item_id` diisi, `gudang_asal` tergantung `surat_jalan.gudang_asal_id` |
| `surat-jalan.repository.js:581` | INBOUND (add inbound stock) | Tidak | `surat_jalan_item_id` diisi |
| `surat-jalan.repository.js:602` | INBOUND (add inbound stock) | Tidak | `surat_jalan_item_id` diisi |
| `surat-jalan.repository.js:784` | OUTBOUND (reduce stock) | Tidak | `surat_jalan_item_id` diisi |
| `return.repository.js:683` | RETURN (inbound) | Tidak | `surat_jalan_item_id` bisa null; `return_transaction_id` diisi |

## Titik asal hilang per tipe + keyakinan

### INBOUND
- **Penyebab**: `surat_jalan.gudang_asal_id` nullable. Untuk inbound dari pemasok eksternal (`tipe_pengirim === "external"`), `gudang_asal_id` memang null karena sumber bukan gudang internal. Ini **sesuai desain**, tetapi UI tidak menampilkan label alternatif (mis. "Eksternal"/"Supplier").
- **Keyakinan**: Tinggi

### OUTBOUND
- **Penyebab**: `surat_jalan.gudang_asal_id` nullable. Untuk outbound dengan `tipe_pengirim === "external"`, `gudang_asal_id` bisa null. Namun untuk outbound internal, `gudang_asal_id` seharusnya diisi. Jika masih kosong, kemungkinan data surat_jalan tidak lengkap.
- **Keyakinan**: Tinggi

### RETURN
- **Penyebab**: Stok ledger return hanya menyimpan `return_transaction_id` dan opsional `surat_jalan_item_id`. Query `getStockHistory` tidak include `return_transaction`, sehingga jika `surat_jalan_item_id` null, tidak ada info gudang yang bisa ditampilkan.
- **Keyakinan**: Sedang (butuh verifikasi apakah return selalu punya `surat_jalan_item_id`)

### Umum
- **Tidak ada fallback**: Backend tidak melakukan COALESCE atau join ke tabel lain (mis. `return_transaction`, `zona.gudang`) untuk mengisi asal/tujuan jika `surat_jalan.gudang_asal_id`/`gudang_tujuan_id` null.
- **Keyakinan**: Tinggi

## Query SQL verifikasi

```sql
-- Hitung baris riwayat stok per tipe dengan asal NULL vs terisi
SELECT 
  sj.tipe,
  COUNT(*) AS total,
  COUNT(CASE WHEN sj.gudang_asal_id IS NULL THEN 1 END) AS gudang_asal_null,
  COUNT(CASE WHEN sj.gudang_asal_id IS NOT NULL THEN 1 END) AS gudang_asal_terisi,
  COUNT(CASE WHEN sj.gudang_tujuan_id IS NULL THEN 1 END) AS gudang_tujuan_null,
  COUNT(CASE WHEN sj.gudang_tujuan_id IS NOT NULL THEN 1 END) AS gudang_tujuan_terisi
FROM stok_ledger sl
JOIN surat_jalan_item sji ON sl.surat_jalan_item_id = sji.item_id
JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
GROUP BY sj.tipe;

-- Contoh 5 baris inbound terbaru dengan kolom asal dan referensinya
SELECT 
  sl.ledger_id,
  sl.jenis_mutasi,
  sl.qty,
  sj.tipe,
  sj.nomor_surat_jalan,
  ga.nama_gudang AS gudang_asal,
  gt.nama_gudang AS gudang_tujuan,
  sl.surat_jalan_item_id,
  sl.return_transaction_id
FROM stok_ledger sl
JOIN surat_jalan_item sji ON sl.surat_jalan_item_id = sji.item_id
JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
LEFT JOIN gudang ga ON sj.gudang_asal_id = ga.gudang_id
LEFT JOIN gudang gt ON sj.gudang_tujuan_id = gt.gudang_id
WHERE sj.tipe = 'inbound'
ORDER BY sl.waktu_mutasi DESC
LIMIT 5;

-- Contoh 5 baris outbound terbaru
SELECT 
  sl.ledger_id,
  sl.jenis_mutasi,
  sl.qty,
  sj.tipe,
  sj.nomor_surat_jalan,
  ga.nama_gudang AS gudang_asal,
  gt.nama_gudang AS gudang_tujuan,
  sl.surat_jalan_item_id,
  sl.return_transaction_id
FROM stok_ledger sl
JOIN surat_jalan_item sji ON sl.surat_jalan_item_id = sji.item_id
JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
LEFT JOIN gudang ga ON sj.gudang_asal_id = ga.gudang_id
LEFT JOIN gudang gt ON sj.gudang_tujuan_id = gt.gudang_id
WHERE sj.tipe = 'outbound'
ORDER BY sl.waktu_mutasi DESC
LIMIT 5;
```

## Usulan perbaikan

### 1. Perbaikan penulisan (backend)
- Tidak perlu ubah schema `stok_ledger` (tidak ada kolom asal di sana).
- Pastikan saat create `surat_jalan` untuk INBOUND/OUTBOUND, `gudang_asal_id` dan `gudang_tujuan_id` selalu diisi sesuai tipe. Untuk INBOUND eksternal, bisa tambah flag `tipe_pengirim` agar frontend bisa menampilkan label berbeda.
- Ukuran: kecil, di `surat-jalan.service.js` / `surat-jalan.repository.js`.

### 2. Fallback turunan di sisi baca (backend)
- Di `reports.repository.js:getStockHistory()` (dan export), tambahkan fallback:
  - Jika `suratJalan?.gudang_asal` null, coba derive dari `item?.zona?.gudang?.nama_gudang` (untuk outbound picking) atau dari `return_transaction` (untuk return).
  - Jika masih null, tampilkan "-" tapi dengan label yang lebih informatif jika memungkinkan (mis. "Eksternal" untuk inbound dari supplier).
- Ukuran: sedang, di `reports.repository.js` sekitar baris 484-485.

### 3. Tampilan kolom Asal (frontend)
- Untuk INBOUND: jika `gudang_asal` adalah "-" atau null, tampilkan badge "Eksternal"/"Supplier" (ambil dari `surat_jalan.tipe_pengirim` atau `supplier.nama`).
- Untuk OUTBOUND: jika `gudang_asal` "-", tampilkan badge "Zona" + nama zona jika ada, atau "-".
- Konsisten gunakan badge/teks berlabel, jangan hanya "-".
- Ukuran: kecil, di `page.tsx` sekitar baris 1329-1331 dan 1423-1431.

## Hal yang belum diketahui / butuh input saya

1. Apakah `tipe_pengirim` (internal/external) sudah konsisten diisi di semua surat_jalan? Jika belum, fallback ke supplier nama mungkin tidak akurat.
2. Apakah untuk RETURN, `surat_jalan_item_id` selalu terisi? Jika tidak, kita perlu include `return_transaction` di query untuk mendapatkan info gudang tujuan.
3. Apakah ada kasus OUTBOUND internal yang memang sengaja tidak mengisi `gudang_asal_id` (mis. transfer antar zona tanpa surat jalan)?
4. Apakah label "Eksternal" sudah cukup, atau perlu menampilkan nama supplier具体?
