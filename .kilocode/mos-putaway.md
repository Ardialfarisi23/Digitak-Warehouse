# MOS Putaway - Catatan Tahap

## Tahap 1 - Petakan logika MOS sekarang (dokumentasi, belum diubah)

(a) MOS dihitung di:
- backend/src/modules/reconciliation/reconciliation.repository.js:getInventory — inbound via isMosEligibleInbound; cluster mode; import saldo awal boq_item.qty_mos.
- backend/src/modules/boq/boq.repository.js — outbound (non-gudang) sebagai MOS, pakai form outbound/new.
- backend/src/modules/reconciliation/reconciliation.utils.js:115-122 — isMosEligibleInbound: status ready_putaway/disetujui/diterima_didistribusikan, tipe inbound, external, punya project/cluster.
- backend/src/modules/reconciliation/reconciliation.service.js:6-28 — refreshTiketMosUsed aggregasi laporan_mitra.mos -> tiket_material.mos.

(b) Status yang naikkan MOS sekarang (REK-07): inbound ready_putaway/disetujui/diterima_didistribusikan (full qty), dan outbound ke lapangan disetujui/diterima_didistribusikan.

(c) Pemakai MOS: REMAINS = MOS-(BOQ+Additional); status Perhatian/Aman; KpiCard MOS/Remains; tabel & export MOS column; BOQ page; outbound/new form MOS column. Notifikasi: tidak ada referensi mos.

(d) Putaway: TIDAK ada model/tabel `putaway` di schema.prisma. Tidak ada kolom putaway_at/putaway_oleh/qty_ditempatkan. Sinyal terdekat: surat_jalan.status -> diterima_didistribusikan hanya lewat putaway() untuk inbound; surat_jalan_item.zona_id diisi per item; diterima_didistribusikan juga dipakai outbound, jadi dipisahkan via tipe.

## Tahap 2 - Rencana perubahan (disetujui dengan penyesuaian)

Keputusan: (1) MOS naik saat diterima_didistribusikan (putaway utuh), inbound, external, punya project/cluster. Tanpa parsial berbasis zona_id (follow-up: butuh kolom qty_ditempatkan/putaway_at/putaway_oleh). (2) Data lama: tanpa backfill, hanya ubah query. (3) boq_item.qty_mos (saldo awal import) tetap ditambahkan.

(a) refreshTiketMosUsed (reconciliation.service.js:6-28) = jalur terpisah upload laporan (laporan_mitra.mos -> tiket_material.mos), BUKAN sumber MOS getInventory rekonsiliasi/BOQ. Tidak diubah.

## Tahap 3 - Implementasi (DILAKUKAN)

- reconciliation.utils.js:115-122 — isMosEligibleInbound hanya terima status "diterima_didistribusikan" (putaway staf selesai); hapus ready_putaway/disetujui.
- reconciliation.utils.js:124-138 — fungsi bersama buildInboundMosMap(shipmentItems, getKey) untuk mode project + cluster.
- reconciliation.repository.js — project & cluster mode pakai buildInboundMosMap; outbound dihapus dari MOS (outbound tetap dipakai untuk `used` di project mode).
- boq.repository.js — select ditambahi status/project_id/cluster_id/tipe_pengirim; MOS hanya inbound via isMosEligibleInbound; outbound dihapus dari MOS.
- Frontend teks MOS: reconciliation page.tsx:1359, supervisor reconciliation page.tsx:810, exportReconciliationXlsx.ts:432, KpiCard desc reconciliation & supervisor → "barang inbound sudah di-putaway staf + saldo awal import".

## Tahap 4 - Test & verifikasi (DILAKUKAN + TELUSURI DB)

- reconciliation.utils.test.js: ready_putaway/disetujui → false; diterima_didistribusikan → true.
- reconciliation.repository.test.js: ubah inbound test ke status diterima_didistribusikan; tambah 5 test (belum putaway→0, putaway→tepat qty, outbound→0, tidak double counting, saldo awal qty_mos tetap).
- Test backend: 196 lolos, 0 gagal.
- npx tsc --noEmit frontend: hanya error pre-existing di HistoryBarangCell.tsx (tidak terkait).
- Tidak ada console.log baru.

### Temuan langsung database (inbound 132 / CPT-00674, SJ-55467)
- project_id: 19 (FTTH-OPEN-AREA GATOTSUBROTO)
- cluster_id: NET-H-08765 (FTTH Gatot Subroto RW 01)
- boq_id: 62 (BOQ-2026/10/19-0026, status aktif, source top_down)
- tiket: TKT-986 (tiket_id 77, project 19, cluster NET-H-08765, area Bandung)
- barang: CPT-00674 (barang_id 49, item_id 166, qty 100, zona_id 6, status diterima_didistribusikan, tipe inbound, tipe_pengirim external)
- kunci barang cluster mode: NET-H-08765-49

### Akar MOS=0 (DITEMUKAN via DB, bukan asumsi)
Query `shipmentItems` di `reconciliation.repository.js:338-352` tidak memilih kolom `tipe_pengirim`. Akibatnya `isMosEligibleInbound` melakukan `sj.tipe_pengirim !== "external"` = `undefined !== "external"` = true → selalu return false → MOS 0. Bug ini berlaku kode LAMA dan BARU. 
Perbaikan: tambah `tipe_pengirim: true` pada select surat_jalan (reconciliation.repository.js:346) dan boq.repository.js (sudah ditambahi). Setelah fix: MOS CPT-00674 = 170 (termasuk inbound 132 qty 100), REMAINS = 40 (boq 100 + additional 30).

Follow-up (belum diubah): putaway parsial butuh kolom qty_ditempatkan/putaway_at/putaway_oleh di surat_jalan_item; saat ini hanya status diterima_didistribusikan (putaway utuh).
