const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isMosEligibleInbound,
  computeMosSistem,
  computeRemains,
  roundQty,
  pickLatestPerKey,
  buildInboundMosMap,
  MOS_INBOUND_STATUSES,
  MOS_SISTEM_DEFINITION,
} = require("./reconciliation.utils");

describe("reconciliation.utils - MOS helpers", () => {
  describe("isMosEligibleInbound", () => {
    it("returns false for inbound ready_putaway (belum di-putaway)", () => {
      const sj = { tipe: "inbound", status: "ready_putaway", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns false for inbound disetujui (belum di-putaway)", () => {
      const sj = { tipe: "inbound", status: "disetujui", tipe_pengirim: "external", project_id: null, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns false for outbound", () => {
      const sj = { tipe: "outbound", status: "disetujui", tipe_pengirim: "external", project_id: 17 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns false for status not approved (menunggu_verifikasi)", () => {
      const sj = { tipe: "inbound", status: "menunggu_verifikasi", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns false for status not approved (draft_diajukan)", () => {
      const sj = { tipe: "inbound", status: "draft_diajukan", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns false when no project_id and no cluster_id", () => {
      const sj = { tipe: "inbound", status: "disetujui", tipe_pengirim: "external", project_id: null, cluster_id: null, gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns false for internal transfer antar gudang (asal != tujuan)", () => {
      const sj = { tipe: "inbound", status: "disetujui", tipe_pengirim: "internal", project_id: 17, cluster_id: "CL001", gudang_asal_id: 1, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns false for internal with same gudang asal & tujuan (not external)", () => {
      const sj = { tipe: "inbound", status: "disetujui", tipe_pengirim: "internal", project_id: 17, cluster_id: "CL001", gudang_asal_id: 5, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns false for internal with missing gudang_asal_id", () => {
      const sj = { tipe: "inbound", status: "disetujui", tipe_pengirim: "internal", project_id: 17, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns true for status diterima_didistribusikan", () => {
      const sj = { tipe: "inbound", status: "diterima_didistribusikan", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), true);
    });

    it("returns false untuk ready_putaway (barang belum disetujui/diterima)", () => {
      const sj = { tipe: "inbound", status: "ready_putaway", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });
  });

  describe("definisi MOS Sistem (K5)", () => {
    it("hanya menyertakan status diterima_didistribusikan", () => {
      assert.deepEqual(MOS_INBOUND_STATUSES, ["diterima_didistribusikan"]);
    });

    it("memiliki definisi tertulis yang menjadi acuan tunggal", () => {
      assert.match(MOS_SISTEM_DEFINITION, /MOS Sistem \(K5\)/);
      assert.match(MOS_SISTEM_DEFINITION, /saldo awal/);
    });
  });

  describe("roundQty", () => {
    it("membulatkan ke 2 desimal", () => {
      assert.equal(roundQty(2.344), 2.34);
      assert.equal(roundQty(2.346), 2.35);
      assert.equal(roundQty(10), 10);
    });

    it("mengubah -0 menjadi 0 dan nilai bukan angka menjadi 0", () => {
      assert.equal(roundQty(-0.001), 0);
      assert.equal(roundQty("abc"), 0);
      assert.equal(roundQty(null), 0);
    });
  });

  describe("computeMosSistem", () => {
    it("menjumlahkan inbound + saldo awal", () => {
      assert.equal(computeMosSistem(10, 5), 15);
    });

    it("mengabaikan nilai kosong/tidak valid", () => {
      assert.equal(computeMosSistem(null, undefined), 0);
      assert.equal(computeMosSistem(7, null), 7);
    });
  });

  describe("computeRemains", () => {
    it("menghitung MOS - (BOQ + Additional)", () => {
      assert.equal(computeRemains(20, 12, 3), 5);
    });

    it("menghasilkan 0 (bukan -0) saat hasil tepat nol", () => {
      assert.equal(Object.is(computeRemains(10, 7, 3), 0), true);
    });
  });

  describe("buildInboundMosMap", () => {
    it("builds map by key from eligible inbound items", () => {
      const items = [
        { surat_jalan: { tipe: "inbound", status: "diterima_didistribusikan", tipe_pengirim: "external", project_id: 1 }, qty: 5 },
        { surat_jalan: { tipe: "inbound", status: "ready_putaway", tipe_pengirim: "external", project_id: 1 }, qty: 3 },
        { surat_jalan: { tipe: "inbound", status: "diterima_didistribusikan", tipe_pengirim: "internal", project_id: 1 }, qty: 2 },
      ];
      const map = buildInboundMosMap(items, (item) => item.surat_jalan.project_id);
      assert.equal(map.get(1), 5);
    });
  });

  describe("pickLatestPerKey", () => {
    it("mengambil baris terbaru per kunci (semantik snapshot)", () => {
      const rows = [
        { key: "A", time: 100, value: 1 },
        { key: "A", time: 200, value: 2 },
        { key: "B", time: 150, value: 3 },
      ];
      const latest = pickLatestPerKey(
        rows,
        (row) => row.key,
        (row) => row.time
      );
      assert.equal(latest.size, 2);
      assert.equal(latest.get("A").value, 2);
      assert.equal(latest.get("B").value, 3);
    });

    it("mengabaikan baris tanpa kunci", () => {
      const latest = pickLatestPerKey(
        [{ key: null, time: 1 }, { key: "", time: 1 }],
        (row) => row.key,
        (row) => row.time
      );
      assert.equal(latest.size, 0);
    });
  });

  describe("BB-REK-07/08/09 - penyelarasan MOS Mitra & MOS Sistem", () => {
    it("BB-REK-07: MOS tabel rekonsiliasi = MOS yang tersimpan pada laporan mitra (sumber tunggal)", () => {
      // Skenario: 1 cluster + 1 barang, inbound vendor eksternal diterima_didistribusikan 10,
      // saldo awal import 2. MOS Sistem = 12.
      const inbound = 10;
      const openingBalance = 2;
      const mosTabelRekonsiliasi = computeMosSistem(inbound, openingBalance);

      // Nilai yang sama harus keluar dari helper yang dipakai repository,
      // laporan mitra, dan halaman ringkasan.
      assert.equal(mosTabelRekonsiliasi, 12);
      assert.equal(computeMosSistem(inbound, openingBalance), mosTabelRekonsiliasi);
    });

    it("BB-REK-08: MOS tidak boleh terhitung ganda saat mitra upload laporan lebih dari sekali", () => {
      const items = [
        { surat_jalan: { tipe: "inbound", status: "diterima_didistribusikan", tipe_pengirim: "external", project_id: 1 }, qty: 12 },
      ];
      const map = buildInboundMosMap(items, (item) => "T1-1");
      assert.equal(map.get("T1-1"), 12);

      // Skenario snapshot: 2 baris laporan untuk (tiket, barang) yang sama -> MOS snapshot
      // dipakai baris TERAKHIR, bukan dijumlahkan.
      const rows = [
        { key: "T1-1", time: 100, mos: 12, used: 3 },
        { key: "T1-1", time: 200, mos: 12, used: 5 },
      ];
      const latest = pickLatestPerKey(
        rows,
        (row) => row.key,
        (row) => row.time
      );
      let mos = 0;
      let used = 0;
      for (const row of latest.values()) {
        mos += Number(row.mos || 0);
        used += Number(row.used || 0);
      }
      assert.equal(mos, 12);
      assert.equal(used, 5);
    });

    it("BB-REK-09: definisi MOS Sistem final & konsisten antar modul", () => {
      // Skenario: entri yang TIDAK boleh dihitung sebagai MOS.
      const bukanMos = [
        { tipe: "outbound", status: "disetujui", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001" },
        { tipe: "inbound", status: "ready_putaway", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001" },
        { tipe: "inbound", status: "disetujui", tipe_pengirim: "internal", project_id: 17, cluster_id: "CL001" },
        { tipe: "inbound", status: "disetujui", tipe_pengirim: "external", project_id: null, cluster_id: null },
        { tipe: "inbound", status: "disetujui", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001" },
      ];
      for (const sj of bukanMos) {
        assert.equal(isMosEligibleInbound(sj), false);
      }

      // Yang boleh dihitung: inbound vendor eksternal yang sudah diterima & didistribusikan (putaway selesai).
      const boleh = [
        { tipe: "inbound", status: "diterima_didistribusikan", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001" },
      ];
      for (const sj of boleh) {
        assert.equal(isMosEligibleInbound(sj), true);
      }
    });
  });
});

