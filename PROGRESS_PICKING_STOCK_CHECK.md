# PROGRESS PICKING STOCK CHECK

## Langkah 1 - Cek pemakai
- `getPickingStockAvailability` hanya dipanggil di:
  - `backend/src/modules/warehouse/warehouse.service.js:554` → `getPickingStockCheck`
  - `backend/src/modules/warehouse/warehouse.controller.js` → route `GET /:gudang_id/picking-stock-check`
  - `backend/src/modules/warehouse/warehouse.routes.js:38`
- Frontend: `frontend/app/staff/outbound/[suratJalanId]/picking/page.tsx:569`
- TIDAK dipakai di jalur retrieve/submit picking (`surat-jalan.service.js` tidak memanggilnya)

## Langkah 2 - Backend: hapus filter kondisi
- File: `backend/src/modules/warehouse/warehouse.repository.js`
- Hapus baris 193-195 dan 201 yang memfilter `kondisi`
- Sekarang endpoint mengembalikan SEMUA kondisi stok untuk barang & gudang yang diminta

## Langkah 3 - Frontend
- Tidak diubah karena logic filtering sudah benar di `getValidZonesForItem` dan toggle sudah ada
- Setelah backend mengembalikan semua kondisi, `pickingStockByItem` akan berisi stok `rusak_ringan`, sehingga `otherKondisi` tidak kosong dan toggle akan muncul
