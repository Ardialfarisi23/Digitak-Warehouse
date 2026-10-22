# PROGRESS BB-REK-09, K5, dan nama test roundQty

## BAGIAN 1 - Update BB-REK-09
- Status: SELESAI
- File diubah: `backend/src/modules/reconciliation/reconciliation.utils.test.js`
- Perubahan:
  - Memindahkan entri `{ tipe: "inbound", status: "disetujui", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001" }` dari daftar `boleh` ke daftar `bukanMos`.
  - Di daftar `boleh`, hanya menyisakan `{ tipe: "inbound", status: "diterima_didistribusikan", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001" }`.
  - Memperbarui komentar agar tidak menyiratkan `disetujui` = MOS (`// Yang boleh dihitung: inbound vendor eksternal yang sudah diterima & didistribusikan (putaway selesai).`).
  - Entri `bukanMos` yang ada sebelumnya tetap dipertahankan.
  - Test lain di file ini tidak diubah.

## BAGIAN 2 - Selaraskan konstanta + test K5
- Status: SELESAI
- Hasil grep seluruh repo untuk `MOS_INBOUND_STATUSES`:
  - `backend/src/modules/reconciliation/reconciliation.utils.js:40` (definisi)
  - `backend/src/modules/reconciliation/reconciliation.utils.js:194` (export)
  - `backend/src/modules/reconciliation/reconciliation.utils.test.js:9` (import)
  - `backend/src/modules/reconciliation/reconciliation.utils.test.js:73` (test K5)
  (Tidak ada pemakai lain di backend maupun frontend)
- Perubahan yang dilakukan:
  - `backend/src/modules/reconciliation/reconciliation.utils.js`: konstanta diubah menjadi `const MOS_INBOUND_STATUSES = ["diterima_didistribusikan"];`
  - `backend/src/modules/reconciliation/reconciliation.utils.test.js`: nama test dan asersi diubah menjadi `hanya menyertakan status diterima_didistribusikan` dengan ekspektasi `["diterima_didistribusikan"]`.
  - Logika produksi `isMosEligibleInbound` tidak diubah dan tidak disambungkan ke konstanta ini.

## BAGIAN 3 - Nama test roundQty
- Status: SELESAI
- Hasil pencarian:
  - Ditemukan karakter asing `值为` pada nama test di file `backend/src/modules/reconciliation/reconciliation.utils.test.js:89`.
- Perubahan yang dilakukan:
  - Mengubah nama test dari:
    `it("mengubah -0 menjadi 0 dan值为 bukan angka menjadi 0", () => {`
    menjadi:
    `it("mengubah -0 menjadi 0 dan nilai bukan angka menjadi 0", () => {`
  - Asersi di dalam test tidak diubah.

## BAGIAN 4 - Verifikasi
- Status: SELESAI
- Verifikasi Test Terkait (`node --test src/modules/reconciliation/reconciliation.utils.test.js`):
  - Total tests: 23
  - Pass: 23
  - Fail: 0
  - Rincian:
    - `isMosEligibleInbound`: 11 passed
    - `definisi MOS Sistem (K5)`: 2 passed
    - `roundQty`: 2 passed
    - `computeMosSistem`: 2 passed
    - `computeRemains`: 2 passed
    - `buildInboundMosMap`: 1 passed
    - `BB-REK-07/08/09`: 3 passed (termasuk `BB-REK-09: definisi MOS Sistem final & konsisten antar modul`)
- Verifikasi Seluruh Test Backend (`npm test`):
  - Total tests: 255
  - Pass: 254
  - Fail: 1 (tidak berkaitan dengan perubahan ini)
  - Detail kegagalan yang tidak berkaitan:
    - Test: `src/modules/reconciliation/reconciliation.repository.test.js:1:1`
    - Pesan: `SyntaxError: Invalid or unexpected token` pada baris 1 (masalah encoding/BOM pada file repository.test.js dari task terdahulu). Sesuai arahan, tidak diperbaiki karena di luar scope perubahan ini.

## TASK STEP 3 - Diagnosa + Perbaikan reconciliation.repository.test.js
- Status: SELESAI
- Penyebab SyntaxError:
  - File tersimpan dalam encoding **UTF-16 LE dengan BOM (`FF FE`)** (kemungkinan akibat perintah redirect/Set-Content di PowerShell sesi terdahulu yang secara default menggunakan UTF-16).
  - Node.js membaca file sebagai UTF-8, sehingga byte `FF FE` dianggap invalid token pada karakter pertama baris 1.
- Apakah kerusakan sudah ada di HEAD:
  - Di commit HEAD (`eb6a058`), file sebenarnya dalam format UTF-8 (15.784 bytes), TETAPI berisi sisa **conflict markers Git** (`<<<<<<< HEAD`, `=======`, `>>>>>>> c5036e8`).
  - Seseorang pada sesi terdahulu telah membersihkan conflict markers di working tree, namun file tersimpan kembali sebagai UTF-16 LE + BOM (30.492 bytes) dan komentar baris 51 mengalami mojibake (`yangσîàσÉ½`).
- Perbaikan yang dilakukan:
  - Mengonversi file kembali ke format bersih **UTF-8 tanpa BOM**.
  - Merapikan komentar pada baris 51 dari teks mojibake menjadi `yang mencakup`.
  - Tidak ada perubahan pada isi test lain, asersi, maupun logika produksi.
- Temuan soal asumsi status `disetujui`:
  - **TIDAK ADA** test di `reconciliation.repository.test.js` yang mengasumsikan `disetujui` dihitung MOS.
  - Semua test positif MOS menggunakan `status: "diterima_didistribusikan"`.
  - Test non-MOS menguji status: `ready_putaway`, `menunggu_verifikasi`, transfer internal, outbound, atau tanpa project/cluster.
- Hasil Verifikasi:
  - `node --test src/modules/reconciliation/reconciliation.repository.test.js`: **18 passed, 0 failed**.
  - `npm test` (seluruh suite backend): **272 passed, 0 failed, 56 suites** (100% pass).




