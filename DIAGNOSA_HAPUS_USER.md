# DIAGNOSA: Penghapusan Data Personil & User (6 Akun Target)

---

## 1. Peta Tabel & File Terkait

| Tabel / Model | File Schema | File Seed | Relasi Utama |
|---|---|---|---|
| `user_account` | `backend/prisma/schema.prisma:10-61` | `backend/prisma/seeders/user.seed.js` | Tabel user utama (login, role, auth) |
| `personil` | `backend/prisma/schema.prisma:91-123` | `backend/prisma/seeders/personnel.seed.js` | Data operasional (staff, supervisor, driver) |
| `user_gudang` | `backend/prisma/schema.prisma:77-89` | - | Penugasan gudang multi (FK ke user_account, CASCADE) |
| `user_notification_preferences` | `backend/prisma/schema.prisma:63-75` | - | Preferensi notif per user (FK ke user_account, CASCADE) |

**Relasi Personil ↔ User:**
- `personil.user_id` → `user_account.user_id` (unique, optional di personil)
- **Bukan 1:1 wajib**: 3 dari 6 target **tidak punya record personil** (hanya user_account)

---

## 2. Daftar 6 Target → Ditemukan di Mana

| # | Nama | user_id | personil_id | Email | Role (user_account) | Jenis/Posisi (personil) | Asal Data |
|---|---|---|---|---|---|---|---|
| 1 | **Devan** | 30 | 27 | Bos@digitakgudang.com | supervisor | teknisi / Supervisor | **Manual** (tdk di seed) |
| 2 | **Gan Gan** | 28 | 21 | gan@digitakgudang.com | staf_gudang | teknisi / Staff Gudang | **Manual** (tdk di seed) |
| 3 | **Yofi Tri Jaya Subrata** | 29 | 22 | Yofi@digitakgudang.com | staf_gudang | teknisi / Staff Gudang | **Manual** (tdk di seed) |
| 4 | **Staff Gudang** | 3 | — | staff@gmail.com | staf_gudang | — (tidak ada personil) | **Seed** `user.seed.js` |
| 5 | **Supervisor Gudang** | 2 | — | supervisor@gmail.com | supervisor | — (tidak ada personil) | **Seed** `user.seed.js` |
| 6 | **Admin General** | 1 | — | admin@gmail.com | admin_general | — (tidak ada personil) | **Seed** `user.seed.js` |

**Catatan tambahan:**
- Ada **Ardi Alfarisi** (user_id=4, email=admin@digitakgudang.com, role=admin_general, personil_id=1) — **bukan target**, akan tetap ada.
- Seed `personnel.seed.js` membuat 15 user+personil (Ahmad Fauzi, Budi Santoso, dll) — **bukan target**.

---

## 3. Daftar Dependensi per Tabel + Perilaku FK

### A. Tabel yang mereferensikan `user_account.user_id`

| Tabel / Kolom | Jumlah Ref (estimasi dari backup) | Perilaku FK (schema) | Catatan |
|---|---|---|---|
| `user_notification_preferences.user_id` | ~3-6 per user | **CASCADE** | Aman dihapus otomatis |
| `user_gudang.user_id` | 0-2 per user | **CASCADE** | Aman dihapus otomatis |
| `audit_log.actor_id` | **Banyak** (semua aktivitas user) | **RESTRICT** (default) | **Bloker hard delete** |
| `notification.user_id` | ~10-50 per user | **RESTRICT** (default) | **Bloker hard delete** |
| `approval_log.approver_id` | Beberapa | **RESTRICT** (default) | **Bloker hard delete** |
| `*_created_by`, `*_updated_by` (barang, boq, gudang, project, dll) | Banyak | **RESTRICT** (default) | **Bloker hard delete** |
| `zona_utilisasi_log.diperbarui_oleh` | Beberapa | **RESTRICT** | **Bloker hard delete** |
| `reconciliation_upload_log.uploaded_by` | Beberapa | **RESTRICT** | **Bloker hard delete** |
| `laporan_mitra.uploaded_by` | Beberapa | **RESTRICT** | **Bloker hard delete** |
| `return_transaction.created_by/approved_by/received_by` | Beberapa | **RESTRICT** | **Bloker hard delete** |
| `surat_jalan.dilaporkan_tiba_oleh/dikonfirmasi_oleh` | Beberapa | **RESTRICT** | **Bloker hard delete** |
| `surat_jalan_transit.tiba_by/berangkat_by` | Beberapa | **RESTRICT** | **Bloker hard delete** |
| `surat_jalan_item.diperiksa_oleh` | Beberapa | **RESTRICT** | **Bloker hard delete** |

### B. Tabel yang mereferensikan `personil.personil_id`

| Tabel / Kolom | Perilaku FK | Catatan |
|---|---|---|
| `gudang.pic_id` | RESTRICT | Hanya Devan (personil_id=27) tidak punya gudang_id |
| `cluster.pic_id` | RESTRICT | Perlu cek data aktual |
| `permintaan_boq.diajukan_oleh` | RESTRICT | Devan/Gan Gan/Yofi mungkin mereferensikan |
| `permintaan_boq.ditinjai_oleh` | RESTRICT | |
| `surat_jalan.personil_pengantar_id` | RESTRICT | **Gan Gan terlihat di surat_jalan (backup line 4226)** |

---

## 4. Hard Delete vs Soft Delete: Rekomendasi

| Entitas | Rekomendasi | Alasan |
|---|---|---|
| **user_account** | **Soft delete (`is_aktif=false`)** | Terlalu banyak FK `RESTRICT` ke tabel transaksional (audit_log, notification, created_by, dll). Hard delete akan gagal (P2003) atau merusak riwayat. |
| **personil** | **Soft delete (`is_aktif=false`)** + hapus `user_id` (set null) | Sama: FK ke surat_jalan, permintaan_boq, gudang.pic, cluster.pic. Kode `personnel.repository.remove()` sudah *fallback* ke soft delete saat P2003. |
| **user_gudang** | **Hard delete (CASCADE)** | Otomatis terhapus saat user_account dihapus (tapi kita soft delete user, jadi manual cleanup). |
| **user_notification_preferences** | **Hard delete (CASCADE)** | Sama. |

**Kesimpulan:** Gunakan **soft delete** untuk `user_account.is_aktif=false` dan `personil.is_aktif=false`. Jangan hard delete.

---

## 5. Risiko & Hal Butuh Keputusan

| Risiko | Detail | Status |
|---|---|---|
| **Sistem terkunci (no admin)?** | **TIDAK**. Masih ada **Ardi Alfarisi** (user_id=4, admin_general, aktif). | ✅ Aman |
| **Sistem tanpa supervisor?** | **TIDAK**. Masih ada Budi, Rina, Dedi, Renal, Putri, Nanda (6 supervisor aktif). | ✅ Aman |
| **Riwayat transaksi jadi error/blank?** | **YA** jika hard delete. `audit_log.actor_id`, `notification.user_id`, `created_by` akan gagal join. Soft delete aman: data tetap ada, user hanya nonaktif. | ⚠️ Pakai soft delete |
| **Gan Gan di surat_jalan** | Backup menunjukkan `surat_jalan` dengan `driver_nama_teks = 'Gan Gan'` (line 4226). Kolom ini **teks bebas**, bukan FK. Tidak blokir hapus personil. | ✅ Tidak blokir |
| **Devan di tiket_material/barang** | Backup: `tiket_material` pic_mitra='Devan', `barang.kode_perangkat` mengandung 'Devan'. Kolom teks, bukan FK. | ✅ Tidak blokir |
| **Logika hardcode nama/role** | Tidak ditemukan hardcode nama "Devan"/"Gan Gan"/"Yofi" di kode. Role `admin_general`/`supervisor`/`staf_gudang` dipakai di middleware/queries — **tidak bergantung user spesifik**. | ✅ Aman |
| **Seed otomatis recreate** | `user.seed.js` pakai `upsert` by email. Jika email target tetap ada di DB (soft delete), seed **tidak akan recreate**. Jika hard delete → seed akan recreate. | ⚠️ Soft delete mencegah recreate |

---

## 6. Usulan Urutan Langkah Penghapusan (Step 2, 3, dst)

> **Hanya usulan — BELUM dieksekusi.**

### Step 2: Soft Delete `personil` (3 target yang punya personil)
**File:** `backend/prisma/seeders/` — **BUKAN seed**, buat script terpisah atau `prisma` CLI.
```sql
-- 1. Nonaktifkan personil dulu (wajib sebelum delete per personnel.service.js)
UPDATE personil SET is_aktif=false, updated_at=now() 
WHERE personil_id IN (27, 21, 22); -- Devan, Gan Gan, Yofi

-- 2. Putus relasi ke user_account (optional, tapi bersih)
UPDATE personil SET user_id=NULL, updated_at=now() 
WHERE personil_id IN (27, 21, 22);
```
**File disentuh:** Script SQL / Prisma script ad-hoc (bukan file permanen).

### Step 3: Soft Delete `user_account` (6 target)
```sql
UPDATE user_account SET is_aktif=false, updated_at=now() 
WHERE user_id IN (30, 28, 29, 3, 2, 1);
```
**File disentuh:** Script SQL / Prisma script ad-hoc.

### Step 4: Cleanup `user_gudang` & `user_notification_preferences` (opsional, CASCADE tapi bersihkan manual)
```sql
DELETE FROM user_gudang WHERE user_id IN (30,28,29,3,2,1);
DELETE FROM user_notification_preferences WHERE user_id IN (30,28,29,3,2,1);
```

### Step 5: Verifikasi
- Cek login: 6 akun tidak bisa login (`is_aktif=false` dicek di `auth.service.js:20,78`).
- Cek UI: User tidak muncul di daftar (queries filter `is_aktif=true`).
- Cek riwayat: `audit_log`, `notification`, `created_by` tetap utuh (join ke user nonaktif tetap jalan).

---

## Ringkasan Eksekusi (untuk Step 2 nanti)

| Aksi | Tabel | Target IDs | Metode |
|---|---|---|---|
| Soft delete | personil | 27, 21, 22 | `is_aktif=false`, `user_id=NULL` |
| Soft delete | user_account | 30, 28, 29, 3, 2, 1 | `is_aktif=false` |
| Hard delete (CASCADE) | user_gudang | 30,28,29,3,2,1 | `DELETE` manual |
| Hard delete (CASCADE) | user_notification_preferences | 30,28,29,3,2,1 | `DELETE` manual |

**File yang akan disentuh (Step 2+):**
- Script SQL baru di `backend/scripts/` atau `backend/prisma/manual/` (bukan migrasi)
- **TIDAK** mengubah file seed, schema, atau kode aplikasi.

---

**STEP 1 SELESAI** — Diagnosa lengkap. Siap lanjut Step 2 (eksekusi soft delete) setelah persetujuan.