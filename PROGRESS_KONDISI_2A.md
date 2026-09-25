# PROGRESS KONDISI 2A

## Langkah 1 - Pemetaan endpoint stock-snapshot
- Endpoint: `GET /api/warehouses/:gudang_id/zona/:zona_id/stock-snapshot`
- Backend sudah mengelompokkan per `(barang_id, zona_id, kondisi)` via `groupBy` dan menyertakan field `kondisi` di response.
- Konsumen endpoint:
  - `frontend/app/dashboard/warehouse/page.tsx` (detail zona admin)
  - `frontend/app/dashboard/supervisor/warehousespv/page.tsx` (detail zona supervisor)
  - `frontend/app/dashboard/supervisor/approval/outbound/[id]/page.tsx` (approval outbound)
  - `frontend/app/staff/outbound/new/page.tsx` (create outbound)

## Langkah 2 - Backend
- Tidak diubah karena response stock-snapshot sudah menyertakan `kondisi` per baris.

## Langkah 3 - Frontend
- Menambahkan kolom "Kondisi" memakai `<KondisiBadge value={...} />` di:
  - `frontend/app/dashboard/warehouse/page.tsx` (tabel panel stock)
  - `frontend/app/dashboard/supervisor/warehousespv/page.tsx` (list card detail zona)
  - `frontend/app/dashboard/supervisor/approval/outbound/[id]/page.tsx` (list card stok gudang)
  - `frontend/app/staff/outbound/new/page.tsx` (list card stok gudang)
