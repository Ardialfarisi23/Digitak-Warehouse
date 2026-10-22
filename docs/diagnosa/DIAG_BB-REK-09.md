## BAGIAN A - Temukan test BB-REK-09

- Hasil grep 'BB-REK-09':

  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.test.js:151: it("BB-REK-09: definisi MOS Sistem final & konsisten antar modul", () => {



- Test file: backend/src/modules/reconciliation/reconciliation.utils.test.js
- describe/it: describe('BB-REK-07/08/09 - ...') it('BB-REK-09: definisi MOS Sistem final & konsisten antar modul', ...)
- Blok data/tabel:

        });
    
        it("BB-REK-09: definisi MOS Sistem final & konsisten antar modul", () => {
          // Skenario: entri yang TIDAK boleh dihitung sebagai MOS.
          const bukanMos = [
            { tipe: "outbound", status: "disetujui", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001" },
            { tipe: "inbound", status: "ready_putaway", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001" },
            { tipe: "inbound", status: "disetujui", tipe_pengirim: "internal", project_id: 17, cluster_id: "CL001" },
            { tipe: "inbound", status: "disetujui", tipe_pengirim: "external", project_id: null, cluster_id: null },
          ];
          for (const sj of bukanMos) {
            assert.equal(isMosEligibleInbound(sj), false);
          }
    
          // Yang boleh dihitung: inbound vendor eksternal yang sudah disetujui/diterima.
          const boleh = [
            { tipe: "inbound", status: "disetujui", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001" },
            { tipe: "inbound", status: "diterima_didistribusikan", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001" },
          ];
          for (const sj of boleh) {
            assert.equal(isMosEligibleInbound(sj), true);
          }
        });
      });
    });

- Fungsi/konstanta produksi yang diuji:
  - backend/src/modules/reconciliation/reconciliation.utils.js: isMosEligibleInbound (lines ~164-190), MOS_INBOUND_STATUSES (~40), MOS_SISTEM_DEFINITION (~42-44)


## BAGIAN B - Verifikasi aturan di kode produksi

  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:4: const { computeMosSistem, computeRemains, computeReconciliationStatus, buildPickSummary, buildItemPickSummary, buildInboundMosMap } = require("./reconciliation.utils");
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:93: status: { in: ["disetujui", "diterima_gudang"] },
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:133: surat_jalan_status.disetujui,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:137: surat_jalan_status.diterima_didistribusikan,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:266: // Fetch import saldo awal (qty_additional, qty_mos, qty_used) per boq_item
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:273: select: { boq_item_id: true, qty_additional: true, qty_mos: true, qty_used: true, barang_id: true, boq: { select: { cluster_id: true, tiket: { select: { project_id: true } } } } },
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:281: mos: Number(r.qty_mos || 0),
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:286: const existing = importValuesByCluster.get(key) || { additional: 0, mos: 0, used: 0 };
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:288: existing.mos += val.mos;
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:294: const existing = importValuesByProject.get(key) || { additional: 0, mos: 0, used: 0 };
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:296: existing.mos += val.mos;
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:476: // MOS = inbound yang sudah di-putaway staf (diterima_didistribusikan), external, punya project/cluster
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:477: const mosByProjectBarang = buildInboundMosMap(shipmentItems, (item) => {
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:587: let mosByClusterBarang = new Map();
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:702: // MOS = inbound yang sudah di-putaway staf (diterima_didistribusikan), external, punya project/cluster
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:703: mosByClusterBarang = buildInboundMosMap(shipmentItems, (item) => {
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:912: const importVals = importValuesByCluster.get(key) || { additional: 0, mos: 0, used: 0 };
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:914: const mos = Number(mosByClusterBarang.get(key) || 0) + importVals.mos;
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:917: const remains = computeRemains(mos, agg.boq, additional);
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:996: mos,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:1178: const importVals = importValuesByProject.get(key) || { additional: 0, mos: 0, used: 0 };
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:1180: const mos = computeMosSistem(mosByProjectBarang.get(key) || 0, importVals.mos);
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:1185: const remains = computeRemains(mos, agg.boq, additional);
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.repository.js:1258: mos,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:8: * Refresh angka MOS & Used pada tiket_material.
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:10: * MOS = snapshot TERAKHIR laporan mitra untuk tiap (tiket, barang) lalu
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:11: * dijumlahkan per barang. `laporan_mitra` berisi snapshot MOS per tanggal
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:19: const refreshTiketMosUsed = async (tiketId, tx) => {
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:32: mos: true,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:49: let mos = 0;
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:52: mos += Number(row.mos || 0);
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:60: data: { mos, used },
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:68: * cluster), sehingga angka MOS pada ringkasan rekonsiliasi dan angka MOS
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:72: * @returns {Promise<Map<string, {mos:number, boq:number, additional:number, remains:number}>>}
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:98: mos: Number(row.mos || 0),
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.service.js:259: refreshTiketMosUsed,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:9: * BOQ/MOS/Used/Remains formulas and reconciliation status logic.
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:12: *   MOS kanonik di bawah.
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:20: * DEFINISI FINAL MOS SISTEM (K5) — BUG-06.
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:22: * MOS (Material On Site) adalah material yang sudah masuk ke sistem untuk
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:24: *   1. inbound dari vendor EKSTERNAL yang sudah disetujui/diterima, dan
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:25: *   2. ditambah saldo awal hasil import BOQ (`boq_item.qty_mos`).
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:29: *   - inbound yang belum disetujui/diterima (mis. masih `ready_putaway`,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:33: * `Used` BUKAN bagian dari MOS: nilainya berasal dari input laporan mitra
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:34: * (upload Excel / input manual) dan `Remains` = MOS - (BOQ Plan + Additional).
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:37: * ini supaya angka MOS pada tabel rekonsiliasi, ringkasan, dan riwayat laporan
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:40: const MOS_INBOUND_STATUSES = ["disetujui", "diterima_didistribusikan"];
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:42: const MOS_SISTEM_DEFINITION =
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:43: "MOS Sistem (K5) = inbound vendor eksternal (status disetujui/diterima) + saldo awal (import qty_mos); " +
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:44: "Used = input laporan mitra; Remains = MOS - (BOQ Plan + Additional).";
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:55: * MOS Sistem kanonik = inbound (vendor eksternal) + saldo awal.
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:56: * Fungsi ini adalah satu-satunya tempat rumus MOS formed.
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:58: function computeMosSistem(inboundQty, openingBalanceQty) {
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:62: /** Remains = MOS (Sistem) - (BOQ Plan + Additional) */
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:63: function computeRemains(mos, boq, additional) {
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:64: const val = Number(mos || 0) - (Number(boq || 0) + Number(additional || 0));
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:152: * Menentukan apakah inbound SJ layak menambah MOS.
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:153: * MOS naik saat barang masuk gudang dan di-putaway oleh staf, yaitu
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:154: * status diterima_didistribusikan (hasil putaway), BUKAN saat
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:157: * - Status: diterima_didistribusikan (putaway staf selesai)
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:162: * TIDAK dihitung sebagai MOS, dan transfer internal antar gudang juga tidak.
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:164: function isMosEligibleInbound(sj) {
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:166: if (sj.status !== "diterima_didistribusikan") return false;
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:173: * Bangun Map MOS per key dari daftar item surat jalan, menggunakan fungsi
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:175: * isMosEligibleInbound (diterima_didistribusikan) yang dihitung.
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:179: function buildInboundMosMap(shipmentItems, getKey) {
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:180: const mosMap = new Map();
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:184: if (!isMosEligibleInbound(sj)) continue;
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:188: mosMap.set(key, (mosMap.get(key) || 0) + qty);
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:190: return mosMap;
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:194: MOS_INBOUND_STATUSES,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:195: MOS_SISTEM_DEFINITION,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:197: computeMosSistem,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:203: isMosEligibleInbound,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:204: buildInboundMosMap,

- Analisis:
  - reconciliation.utils.isMosEligibleInbound mensyaratkan status == 'diterima_didistribusikan' (hanya putaway selesai). Jadi 'disetujui' TIDAK dihitung sebagai MOS menurut fungsi ini. Lihat baris ~166 di reconciliation.utils.js.
  - reconciliation.repository menggunakan buildInboundMosMap yang memakai isMosEligibleInbound (repository.js baris ~477, ~703). Jadi di jalur repo, MOS dihitung dari inbound yang eligible (diterima_didistribusikan).
  - Terdapat juga penggunaan lain di repo terkait fetchApprovedReturnsBatch yang memfilter return dengan status ['disetujui','diterima_gudang'] (baris ~93, ~129, ~136, ~138, ~143) - ini berkaitan dengan RETURN, bukan MOS inbound.
  - recon.utils.test: BB-REK-09 menyatakan bukanMos termasuk {tipe:'inbound', status:'disetujui', tipe_pengirim:'internal', ...} dan {inbound, disetujui, external, tanpa project/cluster} -> false. Yang boleh ['disetujui', 'diterima_didistribusikan'] keduanya untuk external dgn project/cluster - sesuai dengan deskripsi test 'inbound vendor eksternal yang sudah disetujui/diterima' boleh dihitung. Namun implementasi isMosEligibleInbound saat ini HANYA mengizinkan 'diterima_didistribusikan' (bukan 'disetujui'). Ini berarti implementasi TIDAK konsisten dengan ekspektasi BB-REK-09 saat ini.


## BAGIAN C - Cek test K5

          const sj = { tipe: "inbound", status: "ready_putaway", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
          assert.equal(isMosEligibleInbound(sj), false);
        });
      });
    
      describe("definisi MOS Sistem (K5)", () => {
        it("hanya menyertakan status disetujui & diterima_didistribusikan", () => {
          assert.deepEqual(MOS_INBOUND_STATUSES, ["disetujui", "diterima_didistribusikan"]);
        });
    
        it("memiliki definisi tertulis yang menjadi acuan tunggal", () => {
          assert.match(MOS_SISTEM_DEFINITION, /MOS Sistem \(K5\)/);
          assert.match(MOS_SISTEM_DEFINITION, /saldo awal/);
        });
      });

- Analisis:
  - Test K5 (utils.test.js ~72-78): memeriksa MOS_INBOUND_STATUSES == ['disetujui','diterima_didistribusikan'] dan MOS_SISTEM_DEFINITION mengandung 'MOS Sistem (K5)'. Konstanta ini ada di reconciliation.utils.js (lines ~40, ~42-44).
  - isMosEligibleInbound (implementasi saat ini) hanya mengizinkan status 'diterima_didistribusikan' - jadi ada inkonsistensi antara konstanta MOS_INBOUND_STATUSES yang didefinisikan sebagai ['disetujui','diterima_didistribusikan'] dengan logika aktual isMosEligibleInbound yang tidak mencocokkannya.
  - Perlu dibedakan: MOS_INBOUND_STATUSES saat ini hanya didefinisikan/diuji, belum digunakan oleh isMosEligibleInbound. buildInboundMosMap menggunakan isMosEligibleInbound. Jadi konstanta mungkin digunakan untuk konteks lain (filter/query/tampilan) - perlu dicek penggunaan MOS_INBOUND_STATUSES di kode produksi.


  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:40: const MOS_INBOUND_STATUSES = ["disetujui", "diterima_didistribusikan"];
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.js:194: MOS_INBOUND_STATUSES,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.test.js:9: MOS_INBOUND_STATUSES,
  - D:\Project\digitak-warehouse\backend\src\modules\reconciliation\reconciliation.utils.test.js:73: assert.deepEqual(MOS_INBOUND_STATUSES, ["disetujui", "diterima_didistribusikan"]);
  (Tidak ditemukan penggunaan MOS_INBOUND_STATUSES di luar file definisinya/tests di modul reconciliation)


## BAGIAN D - Test roundQty

  - Tidak ditemukan karakter non-ASCII/CJK di file test (*.test.*/*.spec.*) pada repo saat ini.
  - Tidak ditemukan test dengan 'roundQty' dan 'bukan angka' bersamaan dengan karakter asing.


## RENCANA PERUBAHAN (usulan)

- (1) BB-REK-09 / MOS eligibility:
  - TEMUAN KRITIS: Aturan yang diminta adalah 'MOS HANYA terhitung setelah status inbound = diterima_didistribusikan. Status disetujui = belum di-putaway = BUKAN MOS'. Namun:
    - reconciliation.utils.isMosEligibleInbound saat ini hanya mengizinkan status 'diterima_didistribusikan' (benar sesuai aturan baru).
    - reconciliation.utils.test BB-REK-09 saat ini mengharapkan bahwa inbound dengan status 'disetujui' (external, ada project/cluster) ADALAH boleh dihitung (true) - ini BERTENTANGAN dengan aturan baru. Juga test menyebut 'inbound vendor eksternal yang sudah disetujui/diterima' boleh dihitung.
  - Usulan perbaikan:
    - backend/src/modules/reconciliation/reconciliation.utils.test.js:129-170 (BB-REK-09): ubah blok 'boleh' agar HANYA berisi status 'diterima_didistribusikan' (hapus atau pindahkan 'disetujui' dari 'boleh' ke 'bukanMos'). Sesuai aturan baru.
    - Juga perlu verifikasi: apakah ada kode lain yang mengandalkan MOS_INBOUND_STATUSES = ['disetujui','diterima_didistribusikan']? Saat ini hanya didefinisikan dan diuji di K5 test - jika aturan baru, konstanta ini perlu disesuaikan jadi ['diterima_didistribusikan'] (atau dihapus/digunakan). Namun penggunaan aktual MOS adalah via isMosEligibleInbound; K5 test saat ini mengharapkan konstanta berisi keduanya. Konflik antara K5 test dan aturan baru perlu diputuskan.

- (2) K5/konstantanya:
  - backend/src/modules/reconciliation/reconciliation.utils.js:40 - MOS_INBOUND_STATUSES = ['disetujui','diterima_didistribusikan']
  - backend/src/modules/reconciliation/reconciliation.utils.test.js:72-78 - test 'hanya menyertakan status disetujui & diterima_didistribusikan'
  - Usulan: jika aturan baru berlaku, ubah jadi ['diterima_didistribusikan'] saja. Namun MOS_INBOUND_STATUSES tidak digunakan oleh isMosEligibleInbound/buildInboundMosMap saat ini - bisa jadi digunakan di tempat lain atau hanya untuk dokumentasi/tes. Perlu konfirmasi apakah konstanta ini dipakai untuk filter/query tampilan.

- (3) Nama test roundQty:
  - Tidak ditemukan test dengan karakter asing terkait roundQty/bukan angka di repo saat ini. Tidak ada perubahan diperlukan berdasarkan temuan.


- Risiko:
  - Mengubah BB-REK-09 dan K5 akan mempengaruhi test yang mengharapkan 'disetujui' dihitung sebagai MOS. Perlu cek test lain yang mungkin bergantung pada perilaku lama.
  - repository.getInventory menggunakan buildInboundMosMap (via isMosEligibleInbound) - saat ini isMosEligibleInbound sudah benar (hanya diterima_didistribusikan). Jadi perubahan test mungkin saja sudah diperlukan untuk menyelaraskan dengan implementasi saat ini atau untuk menerapkan aturan baru.
  - Jika MOS_INBOUND_STATUSES digunakan di tempat lain untuk query/filter tampilan, mengubah konstanta bisa berdampak luas.


- Pertanyaan keputusan:
  1. Aturan baru menyatakan 'MOS HANYA terhitung setelah status inbound = diterima_didistribusikan'. Apakah ini benar-benar aturan yang ingin diterapkan (menggantikan definisi lama yang menyebut disetujui/diterima)?
  2. K5 test saat ini mengharapkan MOS_INBOUND_STATUSES berisi ['disetujui','diterima_didistribusikan'] - apakah konstanta ini harus diselaraskan ke aturan baru?
  3. BB-REK-09 test saat ini bertentangan dengan aturan baru - apakah test perlu diperbarui untuk mencerminkan aturan baru?
  4. Apakah ada kebutuhan untuk mengubah isMosEligibleInbound agar mengizinkan 'disetujui'? Saat ini implementasinya sudah sesuai aturan baru.


---
DIAGNOSA SELESAI

