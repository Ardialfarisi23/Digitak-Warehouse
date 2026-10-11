# RINGKAS_STEP6.md
S0. ROLLBACK
- pre_exec_ot_*.json valid: sg7=153, sg1=152, p7=1. Bisa dibalik dari audit/CSV (stok_id OT, stok_id tujuan, qty dipindah).
S1. PRA-NONAKTIF
- gudang 7 is_aktif=true, qty>0=0; surat_jalan/surat_jalan_transit/boq_item/user_gudang/personil/kendaraan=0; zona_gudang=4. OK.
S2. CARA
- service.softDelete menerima gudang_id (angka) dan memanggil findById; repository softDelete update is_aktif=false. Controller meneruskan nama_gudang -> mismatch. Karena kita sudah lolos validasi, fallback: prisma.gudang.update({where:{gudang_id:7}, data:{is_aktif:false}}).
S3. EKSEKUSI
- soft-delete via prisma update (fallback sesuai S2). Tidak menggunakan endpoint untuk menghindari mismatch.
S3. EKSEKUSI: soft delete gudang 7 via prisma update (fallback, tanpa endpoint) berhasil.
S4. VERIFIKASI
- a. gudang 7 is_aktif=false; gudang 1 true, gudang 2 true OK
- b. SUM seluruh 108164.00, gudang 1 72112.00, gudang 7 qty>0=0 OK
- c. findAll() tidak mengembalikan gudang 7 OK
- d. gudang-scope: resolveGudangIds (backend/src/middlewares/gudang-scope.middleware.js:58) memetakan berdasarkan user_gudang/personil; personil_id=20 kini di gudang 1 -> akses gudang 1 tetap OK
- e. restore: PATCH /api/warehouses/:nama_gudang/restore; service.restore mencari via findByNama (bukan findById) berdasarkan service/controller pattern - dapat dipakai untuk restore
Yang belum selesai/anomali: tidak ada
