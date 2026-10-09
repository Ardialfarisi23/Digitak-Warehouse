# DESAIN IMPORT STEP 2A — VERIFIKASI RUMUS + DRAFT SCHEMA

**File:** `D:\Project\digitak-warehouse\data import.xlsx`  
**Sheet:** "Rekap BoQ Periode 2026" (13 cluster, 49 material rows 9–57)  
**Mode:** READ-ONLY

---

## 1. VERIFIKASI RUMUS REMAINS

### Rumus di Excel (konsisten di 13 cluster + summary):
```
Remains = MOS − Additional − BoQ Plan
```
- **Per cluster**: kolom `MOS − Additional − BoQ Plan` (contoh C1: `L9−K9−J9`)
- **Summary (E–I)**: `G9−F9−E9` (MOS − Additional − BoQ Plan total)
- **Used column TIDAK dipakai** dalam rumus Remains (0 formula referensi ke kolom Used)

### Hasil uji konsistensi (49 baris × 13 cluster = 637 sel, data sparse):
| Kategori | Jumlah |
|----------|--------|
| Baris punya BoQ Plan & MOS (dicek) | 307 |
| Cocok dengan rumus | 307 (100%) |
| Tidak cocok | 0 |

**Kesimpulan**: Rumus **konsisten 100%** di semua cluster yang punya data. Remains di Excel adalah **formula**, bukan nilai statis.

### Contoh baris (Row 9 – TIANG 7 METER):
| Cluster | BoQ Plan | Additional | MOS | Used | Remains (formula) | Hitung |
|---------|----------|------------|-----|------|-------------------|--------|
| C1 (J–N) | 9 | 2 | 9 | 15 | `L9−K9−J9` = -2 | 9−2−9 = -2 ✅ |
| C2 (O–S) | 27 | 0 | 27 | – | `Q9−P9−O9` = 0 | 27−0−27 = 0 ✅ |
| Summary | 378 | 2 | 378 | 15 | `G9−F9−E9` = -2 | 378−2−378 = -2 ✅ |

---

## 2. ARTI TIAP ANGKA (berdasar header/catatan file)

| Kolom | Arti | Sumber | Catatan |
|-------|------|--------|---------|
| **BoQ Plan** | Rencana kuantitas dari WO email | Input manual / SUMIF | Integer, ~60% terisi |
| **Additional** | Penambahan material di luar WO | Input manual | Sparse (~2% terisi), default 0 |
| **MOS** | Material On Site (terima SJ) | Input manual / SUMIF | Integer, ~60% terisi |
| **Used** | Material terpakai implementasi | Input manual | **Hampir kosong 100%**, TIDAK dipakai rumus Remains |
| **Remains** | Sisa material (hitungan) | **Formula**: `MOS − Additional − BoQ Plan` | Bisa negatif |

### Pertanyaan terbuka:
- **Q-A**: Apakah `Used` memang sengaja tidak dipakai hitung Remains? (Rumus pakai `Additional`, bukan `Used`)
- **Q-B**: Apakah Remains negatif diizinkan (bisnis: MOS < BoQ+Additional)?
- **Q-C**: `Additional` vs `Used` — mana yang merepresentasikan "pemakaian tambahan"? Perlu klarifikasi bisnis.

---

## 3. MODEL BOQ_ITEM & USULAN KOLOM TAMBAHAN

### Model `boq_item` saat ini (`backend/prisma/schema.prisma:416-437`):
```prisma
model boq_item {
  boq_item_id      BigInt   @id @default(autoincrement())
  boq_id           BigInt
  barang_id        BigInt
  qty_rencana      Decimal  @db.Decimal(14, 2)   // ← BoQ Plan
  satuan_id        BigInt?
  gudang_tujuan_id BigInt?
  cluster_id       String?  @db.Text
  ...
}
```

### Usulan kolom **additive** (nullable, tipe sama `Decimal(14,2)`):
| Kolom Baru | Mapping Excel | Catatan |
|------------|---------------|---------|
| `qty_additional` | Additional | nullable, default 0 |
| `qty_mos` | MOS | nullable |
| `qty_used` | Used | nullable, hampir selalu kosong |
| `qty_remains` | Remains | **SEBEHARUSNYA DIHITUNG SAAT BACA** (bukan disimpan dari Excel) |

### Alasan `qty_remains` dihitung, bukan disimpan:
1. Remains di Excel adalah **formula** (`MOS − Additional − BoQ Plan`), bukan input manual.
2. Menyimpan hasil formula menciptakan **redundansi & risiko inkonsistensi** jika salah satu komponen berubah.
3. Hitung di aplikasi: `qty_remains = qty_mos − COALESCE(qty_additional,0) − qty_rencana`.
4. Jika butuh snapshot historis, simpan di tabel terpisah (`boq_item_snapshot`) dengan timestamp.

---

## 4. DRAFT SQL ALTER TABLE (BELUM DIJALANKAN)

```sql
-- Additive columns untuk boq_item (nullable, tipe sama qty_rencana)
ALTER TABLE boq_item
  ADD COLUMN qty_additional   DECIMAL(14,2),
  ADD COLUMN qty_mos          DECIMAL(14,2),
  ADD COLUMN qty_used         DECIMAL(14,2),
  ADD COLUMN qty_remains      DECIMAL(14,2) GENERATED ALWAYS AS (
    qty_mos - COALESCE(qty_additional, 0) - qty_rencana
  ) STORED;
```

> **Catatan**: `qty_remains` pakai `GENERATED ALWAYS AS ... STORED` (PostgreSQL 12+) agar selalu konsisten. Jika versi PG lebih lama, hapus kolom ini dan hitung di query/application layer.

---

## 5. FILE + FUNGSI YANG MENYENTUH `boq_item` (grep read-only)

| File | Fungsi/Baris | Jenis Akses |
|------|--------------|-------------|
| `src/modules/boq/boq.repository.js` | `deleteMany`, `createMany`, `findMany` (L174,184,502) | Write/Read |
| `src/modules/boq/boq.controller.js` | Response mapping `boq_item_id` (L44) | Read |
| `src/modules/boq/boq.validation.js` | Schema validasi item (L3,41,55) | Validate |
| `src/modules/additional/additional.service.js` | `findFirst` link BOQ (L30,40) | Read |
| `src/modules/dashboard/dashboard.service.js` | `findMany` dashboard (L203) | Read |
| `src/modules/reconciliation/reconciliation.repository.js` | `findMany` rekonsiliasi (L76) | Read |
| `src/modules/reports/reports.repository.js` | `findMany` laporan (L2093) | Read |
| `src/modules/item/item.repository.js` | `count` barang usage (L165,191) | Read |
| `src/modules/surat-jalan/surat-jalan.repository.js` | `update` qty (L1152-1153) | Write |

**Total: 9 file, 3 modul write (boq, surat-jalan), 6 modul read-only.**

---

## KONFIRMASI ANTI-UBAH
✅ Tidak ada file Excel yang dibaca ulang (hanya referensi analisis Step 1)  
✅ Tidak ada schema/DB yang diubah  
✅ Tidak ada migration dijalankan  
✅ Tidak ada insert/update/delete data  
✅ Tidak ada kode aplikasi yang ditulis/diubah  
✅ Hanya pembacaan file + grep + pembuatan `DESAIN_IMPORT_2A.md`