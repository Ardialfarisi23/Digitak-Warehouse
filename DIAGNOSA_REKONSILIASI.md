# Diagnosa Hilangnya Kolom Project & Item/Barang di Halaman Rekonsiliasi

## 1. DAFTAR FILE RELEVAN

| File | Peran |
|------|-------|
| `frontend/app/dashboard/reconciliation/page.tsx` | Halaman rekonsiliasi **Admin** (tabel, filter, export, modal detail) |
| `frontend/app/dashboard/supervisor/reconciliation/page.tsx` | Halaman rekonsiliasi **Supervisor** (tabel, filter, export, modal detail) |
| `frontend/lib/exportReconciliationXlsx.ts` | Export Excel rekonsiliasi (Data Detail sheet) |
| `backend/src/modules/reconciliation/reconciliation.repository.js` | Backend: query & agregasi data inventory (mode cluster & project) |
| `backend/src/modules/reconciliation/reconciliation.controller.js` | Backend: endpoint GET /api/reconciliation/inventory |
| `backend/src/modules/reconciliation/reconciliation.routes.js` | Backend: routing reconciliation |

## 2. PENYEBAB UTAMA

### **Admin: Mismatch nama field (d) + kolom Barang menampilkan ID bukan nama**

**Bukti 1 - Project column pakai field salah (`projectNama` vs `project_nama`):**
```
frontend/app/dashboard/reconciliation/page.tsx:934-939
<td className="px-2 py-1">
  <div className="truncate font-medium text-slate-900 text-xs" title={`${record.projectNama || "-"}${record.area ? ` • ${record.area}` : ""}`}>
    {record.projectNama || "-"}        ← TYPO: projectNama (camelCase) seharusnya project_nama (snake_case)
    {record.area && <span className="ml-1.5 text-[10px] text-slate-400">{record.area}</span>}
  </div>
</td>
```
Interface (line 47): `project_nama: string;` — **snake_case**.
Mapping API (line 267): `project_nama: item.project_nama ?? ...` — **snake_case**.
→ `record.projectNama` selalu `undefined` → kolom Project kosong.

**Bukti 2 - Barang column menampilkan `barang_id` bukan `nama_barang`:**
```
frontend/app/dashboard/reconciliation/page.tsx:981-985
<td className="px-2 py-1 sticky left-0 ...">
  <div className="flex items-center h-full overflow-hidden">
    <div className="truncate font-medium text-slate-800 text-xs leading-4" title={`${record.barang_id || "-"} ...`}>
      {record.barang_id || "-"}        ← MENGAKSES ID, BUKAN NAMA BARANG
    </div>
  </div>
</td>
```
Header (line 864): `<th>Barang</th>` — label benar.
Interface (line 67): `nama_barang: string;` — field nama ada.
Mapping API (line 286): `nama_barang: item.nama_barang ?? ...` — data nama dikirim.
→ Kolom "Barang" menampilkan **kode/ID perangkat**, bukan nama barang.

### **Supervisor: Tidak bermasalah**
- Header: `Project` (line 549) & `Cluster Name` (line 550) + `Barang` (line 552) — **semua ada**.
- Render: `record.project_nama` (line 589) & `record.nama_barang` (line 603) — **field cocok**.
- Data backend dikirim lengkap (repository mengembalikan `project_nama`, `nama_cluster`, `nama_barang`).

## 3. RUANG LINGKUP MASALAH
| Halaman | Project | Cluster Name | Item/Barang |
|---------|---------|--------------|-------------|
| **Admin** | ❌ Kosong (typo field) | ✅ Ada (hidden md:table-cell) | ❌ Menampilkan ID, bukan nama |
| **Supervisor** | ✅ OK | ✅ OK | ✅ OK |

## 4. EKSPORT EXCEL & MODAL DETAIL
- **Export Excel** (`exportReconciliationXlsx.ts`): Sheet "Data Detail" header sudah benar (line 447-471: `Project`, `Cluster Name`, `Barang`, `Kode Perangkat`). Data pakai `r.project_nama`, `r.nama_cluster`, `r.nama_barang` (line 476-502) → **TIDAK TERDAMPAK**.
- **Modal Detail Admin** (line 1094-1105): Menampilkan `selectedRecord.nama_cluster`, `selectedRecord.project_nama` → **OK** (pakai field benar).
- **Modal Detail Supervisor** (line 788-797): Menampilkan `selectedRecord.nama_cluster`, `selectedRecord.cluster_id` → **OK**.

## 5. RENCANA PERBAIKAN MINIMAL

| File | Perubahan |
|------|-----------|
| `frontend/app/dashboard/reconciliation/page.tsx:935-937` | Ganti `record.projectNama` → `record.project_nama` (2x: baris 936 & title 935) |
| `frontend/app/dashboard/reconciliation/page.tsx:983` | Ganti `record.barang_id` → `record.nama_barang` (dan title-nya jika perlu) |

**Urutan step:**
1. Perbaiki typo `projectNama` → `project_nama` di kolom Project (baris 934-939)
2. Perbaiki kolom Barang: tampilkan `nama_barang` bukan `barang_id` (baris 981-985)
3. Verifikasi di browser: kolom Project & Barang muncul datanya
4. (Opsional) Cek apakah `record.barang_id` di title tooltip perlu diganti `record.nama_barang`

## 6. HAL YANG BELUM PASTI
- Apakah ada CSS `hidden md:table-cell` sengaja untuk responsive (Project & Cluster Name hanya tampil di md+)? Jika ya, behavior ini *by design* di mobile — kolom memang disembunyikan di layar kecil.
- Backend `groupBy=cluster` vs `groupBy=project`: Admin memanggil `?groupBy=cluster` (line 236), Supervisor tidak kirim param (default project). Pastikan keduanya butuh kolom yang sama — sudah dikonfirmasi backend mengembalikan field yang dibutuhkan untuk kedua mode.