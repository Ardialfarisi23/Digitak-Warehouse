# DIAGNOSIS STEP 1 — Review Detail Surat Jalan Inbound

## A. Alur Data Halaman

| Layer | Path | Peran |
|-------|------|-------|
| Frontend (halaman) | `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx` | Halaman review detail supervisor |
| Frontend (komponen dokumen) | `frontend/components/surat-jalan/DetailSuratJalanDocument.tsx` | Render dokumen surat jalan + tabel item |
| API endpoint | `GET /api/surat-jalan/:id` | Dipanggil di `page.tsx:54` |
| Controller | `backend/src/modules/surat-jalan/surat-jalan.controller.js:94` (`findById`) | Handler endpoint |
| Service | `backend/src/modules/surat-jalan/surat-jalan.service.js:426` (`findById`) | Authorization + return record |
| Repository | `backend/src/modules/surat-jalan/surat-jalan.repository.js:363` (`findById`) | Query Prisma dengan `baseInclude` |
| Model | `backend/prisma/schema.prisma` | `surat_jalan` (384), `surat_jalan_item` (434), `surat_jalan_item_foto` (461), `user_account` (43) |

**Catatan:** Service `findById` hanya me-return record dari repository tanpa transformasi apapun. Semua raw value (termasuk `kondisi` dan `diperiksa_oleh`) dikirim langsung ke frontend.

## B. Masalah "Kondisi Barang" (rusak_ringan)

**Definisi nilai kondisi:**
- Enum Prisma `kondisi_barang` di `backend/prisma/schema.prisma:674-680`
- Semua nilai: `baik`, `rusak_ringan`, `rusak_berat`, `tidak_sesuai_spek`, `doa`

**Mapping yang sudah ada di project:**
1. Backend `KONDISI_MAP` di `backend/src/modules/surat-jalan/surat-jalan.service.js:338-349` (untuk validasi input UI → enum).
2. Frontend `KONDISI_OPTIONS` di `frontend/app/staff/inbound/[suratJalanId]/page.tsx:106-111` (untuk dropdown staff inbound).

**Lokasi render nilai mentah di halaman review detail:**
1. `frontend/components/surat-jalan/DetailSuratJalanDocument.tsx:289`
   ```tsx
   {tampilkan(item.kondisi ?? item.catatan)}
   ```
2. `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx:379`
   ```tsx
   {selectedDocItem?.kondisi || "-"}
   ```

**Akar masalah:** API mengirim string enum mentah (`rusak_ringan`) dan komponen frontend menampilkannya langsung tanpa mapping ke label human-readable.

## C. Masalah "Diperiksa Oleh" di Modal Foto

**Field penyimpanan:**
- Kolom `diperiksa_oleh` (tipe `BigInt?`) di model `surat_jalan_item` (`backend/prisma/schema.prisma:446`)

**Relasi ke tabel user:**
- Relasi `diperiksa_oleh_user → user_account` sudah didefinisikan di Prisma schema (`schema.prisma:454`)
- Nama relasi: `SuratJalanItemDiperiksaOleh`

**Endpoint yang memberi data foto:**
- `GET /api/surat-jalan/:id` (`surat-jalan.controller.js:94`)
- Repository `findById` menggunakan `baseInclude` (`surat-jalan.repository.js:368`)
- **Masalah:** `baseInclude` **TIDAK** menyertakan `diperiksa_oleh_user` di dalam `items`. Hanya `fotos`, `zona`, `barang`, dan `satuan` yang di-include. Akibatnya API hanya mengembalikan angka `diperiksa_oleh` mentah.

**Lokasi render ID mentah:**
- `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx:387`
  ```tsx
  {(selectedDocItem as any)?.diperiksa_oleh || "-"}
  ```

**Akar masalah:** Query Prisma tidak melakukan eager-load relasi `diperiksa_oleh_user`, sehingga frontend hanya menerima ID numerik dan menampilkannya langsung.

## D. Field Lain yang Menampilkan Kode/ID Mentah (Pola Serupa)

Di halaman review detail yang sama, ditemukan field tambahan yang menampilkan kode/ID mentah:

| Field | File | Baris | Keterangan |
|-------|------|-------|------------|
| `kondisi` | `frontend/components/surat-jalan/DetailSuratJalanDocument.tsx` | 289 | Sama seperti masalah #1, muncul di tabel dokumen utama |
| `kondisi` | `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx` | 379 | Sama seperti masalah #1, muncul di modal dokumentasi barang |
| `diperiksa_oleh` | `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx` | 387 | Sama seperti masalah #2 |
| `boq_id` (fallback) | `frontend/components/surat-jalan/DetailSuratJalanDocument.tsx` | 165 | Jika `boq_number` kosong, menampilkan `BOQ #${data.boq_id}` (ID numerik mentah) |

**Catatan:** Field seperti `supplier.kode`, `satuan.kode_satuan`, dan `barang.kode_perangkat` adalah kode bisnis yang memang ditujukan untuk ditampilkan ke user, bukan ID database mentah.

## E. Rencana Perbaikan yang Diusulkan (Belum Dieksekusi)

**Konfirmasi:** Tidak ada perubahan skema atau data di database. Perbaikan hanya di lapisan frontend (kecuali opsi backend opsional yang hanya menambah include, tidak mengubah data).

### Perbaikan 1 — Kondisi barang (enum → label)
- **File yang diubah:** 
  - `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx`
  - `frontend/components/surat-jalan/DetailSuratJalanDocument.tsx`
- **Cara:** Buat util mapping `KONDISI_LABEL` (mis. `{ baik: "Baik", rusak_ringan: "Rusak Ringan", ... }`) di file shared atau langsung di komponen, lalu ganti render `item.kondisi` dengan `KONDISI_LABEL[item.kondisi] ?? item.kondisi`.
- **Alternatif backend (opsional):** Tambahkan transformasi di `surat-jalan.service.js:findById` atau buat DTO/serializer yang memetakan `kondisi` ke label sebelum dikirim ke frontend. Namun perubahan ini tidak disarankan sesuai aturan "hanya lapisan tampilan".

### Perbaikan 2 — Diperiksa oleh (ID → nama user)
- **File yang diubah:** `frontend/app/dashboard/supervisor/approval/inbound/[id]/page.tsx`
- **Cara:** Karena relasi `diperiksa_oleh_user` sudah ada di Prisma dan `baseInclude` bisa ditambah, ada dua opsi:
  1. **Frontend-only (paling aman sesuai aturan):** Tambahkan state `inspectorsMap` di page, fetch nama user berdasarkan ID `diperiksa_oleh` dari endpoint user, lalu tampilkan nama. Atau lebih sederhana: map manual di frontend dengan mengambil `nama` dari relasi yang sudah di-include di `baseInclude` (lihat opsi 2).
  2. **Backend include (tidak mengubah data):** Tambahkan `diperiksa_oleh_user: { select: { nama: true } }` ke `baseInclude` di `surat-jalan.repository.js:5-41`. Ini hanya mengubah query join, bukan data tersimpan. Kemudian di frontend ganti `(selectedDocItem as any)?.diperiksa_oleh` menjadi `(selectedDocItem as any)?.diperiksa_oleh_user?.nama`.
- **Rekomendasi:** Opsi 2 lebih bersih karena relasi sudah ada di schema dan tidak ada perubahan data. Namun jika harus strictly frontend, gunakan opsi 1.

### Perbaikan 3 — Fallback BOQ ID (opsional)
- **File yang diubah:** `frontend/components/surat-jalan/DetailSuratJalanDocument.tsx:165`
- **Cara:** Jika `boq_number` tidak ada, gunakan teks `BOQ Tidak Diketahui` atau format lain yang tidak menampilkan numeric ID mentah.

## F. Perkiraan Risiko

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Menambahkan `diperiksa_oleh_user` ke `baseInclude` | Menambah 1 join query, tapi tidak mengubah data | Query aman, tidak ada write operation |
| Mapping `kondisi` di frontend | Jika ada nilai kondisi baru di enum yang belum masuk mapping, akan fallback ke raw value | Tambahkan fallback `?? item.kondisi` agar tidak ever crash |
| Fetch user name di frontend (opsi 1) | Tambahkan 1 API call tambahan per item yang diperiksa | Bisa di-cache dengan `useMemo` atau Map |
| Perubahan komponen `DetailSuratJalanDocument` | Bisa mempengaruhi halaman lain yang menggunakan komponen yang sama (outbound, delivery) | Cek semua pemanggil komponen; mapping `kondisi` seharusnya universal dan aman |

**Kesimpulan:** Perbaikan ini berisiko rendah karena tidak melibatkan migrasi data, perubahan schema, atau penghapusan data. Cukup penambahan mapping dan/atau eager-load relasi yang sudah ada.




