# DIAGNOSA STEP 2 — VERIFIKASI + PERBAIKAN MINIMAL

## Langkah 1 — Verifikasi
- Kondisi yang menyaring tiket pada upload validation: `boq.status in ["draft", "aktif", "selesai"]` di `backend/src/modules/reports/reports.controller.js:343-352`.
- Tabel rekonsiliasi menggunakan jalur `boq_item -> boq -> tiket_material` dengan filter status + `source: "top_down"` di `backend/src/modules/reconciliation/reconciliation.repository.js:12-28`.
- Hipotesis terbukti: query upload validation memakai nested one-to-one `boq.where`, yang berisiko menyaring parent `tiket_material`, sehingga `tiketMap` bisa kosong untuk tiket yang sebenarnya valid.

## Langkah 2 — Perbaikan
File yang diubah: `backend/src/modules/reports/reports.controller.js`

### Perubahan
1. Hapus `where` dari nested `boq` pada query `tiket_material.findMany`.
2. Filter status BOQ secara manual di JavaScript agar sesuai tabel rekonsiliasi.
3. Normalisasi kode tiket dari Excel sebelum lookup dan saat membentuk `tiketMap`.
4. Gunakan `tiketMap` dengan kunci yang sudah dinormalisasi.

### Ringkasan diff
- `backend/src/modules/reports/reports.controller.js:343-360` — query tiket diubah jadi tanpa `boq.where`, ditambah filter manual + normalisasi.
- `backend/src/modules/reports/reports.controller.js:364-369` — ekstraksi `kodeTiket` ditambah normalisasi NFKC + trim + uppercase.
- `backend/src/modules/reports/reports.controller.js:395` — lookup Map memakai kunci yang sudah dinormalisasi.

## Langkah 3 — Pesan error
Tidak diubah lagi karena alurnya sudah memisahkan: "Kode Tiket tidak terdaftar" hanya saat `tiketMap` tidak menemukan kode, sedangkan kegagalan barang sudah punya pesan spesifik.

## Langkah 4 — Cek
- `node -c src/modules/reports/reports.controller.js` lolos.
- `require('./src/modules/reports/reports.controller')` lolos.

## Cara manual test
1. Upload ulang file Excel yang sebelumnya gagal, dengan kode tiket `TKT-SI-2026-0149`.
2. Harus muncul di Pratinjau Hasil Parsing dengan status berhasil.
3. Kolom PROJECT harus terisi sesuai tiket, minimal `FTTH Open Area Baleendah RW 06`.
