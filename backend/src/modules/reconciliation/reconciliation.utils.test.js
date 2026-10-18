const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isMosEligibleInbound } = require("./reconciliation.utils");

describe("reconciliation.utils - MOS helpers", () => {
  describe("isMosEligibleInbound", () => {
    it("returns true for valid external inbound with project_id", () => {
      const sj = { tipe: "inbound", status: "ready_putaway", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), true);
    });

    it("returns true for valid external inbound with cluster_id only", () => {
      const sj = { tipe: "inbound", status: "disetujui", tipe_pengirim: "external", project_id: null, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), true);
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
      const sj = { tipe: "inbound", status: "ready_putaway", tipe_pengirim: "external", project_id: null, cluster_id: null, gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns false for internal transfer antar gudang (asal != tujuan)", () => {
      const sj = { tipe: "inbound", status: "ready_putaway", tipe_pengirim: "internal", project_id: 17, cluster_id: "CL001", gudang_asal_id: 1, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns false for internal with same gudang asal & tujuan (not external)", () => {
      const sj = { tipe: "inbound", status: "ready_putaway", tipe_pengirim: "internal", project_id: 17, cluster_id: "CL001", gudang_asal_id: 5, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns false for internal with missing gudang_asal_id", () => {
      const sj = { tipe: "inbound", status: "ready_putaway", tipe_pengirim: "internal", project_id: 17, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), false);
    });

    it("returns true for status diterima_didistribusikan", () => {
      const sj = { tipe: "inbound", status: "diterima_didistribusikan", tipe_pengirim: "external", project_id: 17, cluster_id: "CL001", gudang_asal_id: null, gudang_tujuan_id: 5 };
      assert.equal(isMosEligibleInbound(sj), true);
    });
  });
});