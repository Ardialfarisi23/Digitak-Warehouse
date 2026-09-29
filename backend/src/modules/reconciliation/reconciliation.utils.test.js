const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildPickSummary, buildItemPickSummary } = require("./reconciliation.utils");

describe("buildPickSummary", () => {
  it("tanpa baris (legacy)", () => {
    const result = buildPickSummary([], 10);
    assert.strictEqual(result.pick_source, "legacy");
    assert.strictEqual(result.qty_picked_total, null);
    assert.deepStrictEqual(result.pick_breakdown, []);
    assert.strictEqual(result.qty_override_total, null);
    assert.strictEqual(result.pick_mismatch, false);
  });

  it("satu baris sesuai", () => {
    const rows = [{ kondisi_diambil: "baik", is_override: false, qty: 5 }];
    const result = buildPickSummary(rows, 5);
    assert.strictEqual(result.pick_source, "pick");
    assert.strictEqual(result.qty_picked_total, 5);
    assert.deepStrictEqual(result.pick_breakdown, [{ kondisi: "baik", qty: 5, is_override: false }]);
    assert.strictEqual(result.qty_override_total, 0);
    assert.strictEqual(result.pick_mismatch, false);
  });

  it("dua baris beda kondisi dengan override", () => {
    const rows = [
      { kondisi_diambil: "baik", is_override: false, qty: 3 },
      { kondisi_diambil: "rusak_ringan", is_override: true, qty: 2 },
    ];
    const result = buildPickSummary(rows, 5);
    assert.strictEqual(result.pick_source, "pick");
    assert.strictEqual(result.qty_picked_total, 5);
    assert.deepStrictEqual(result.pick_breakdown, [
      { kondisi: "baik", qty: 3, is_override: false },
      { kondisi: "rusak_ringan", qty: 2, is_override: true },
    ]);
    assert.strictEqual(result.qty_override_total, 2);
    assert.strictEqual(result.pick_mismatch, false);
  });

  it("mismatch qty picked vs sj", () => {
    const rows = [{ kondisi_diambil: "baik", is_override: false, qty: 7 }];
    const result = buildPickSummary(rows, 5);
    assert.strictEqual(result.pick_source, "pick");
    assert.strictEqual(result.qty_picked_total, 7);
    assert.strictEqual(result.pick_mismatch, true);
  });

  it("desimal akurat", () => {
    const rows = [{ kondisi_diambil: "baik", is_override: false, qty: 0.1 }, { kondisi_diambil: "baik", is_override: false, qty: 0.2 }];
    const result = buildPickSummary(rows, 0.3);
    assert.strictEqual(result.pick_source, "pick");
    assert.strictEqual(result.qty_picked_total, 0.3);
    assert.strictEqual(result.qty_override_total, 0);
    assert.strictEqual(result.pick_mismatch, false);
  });
});

describe("buildItemPickSummary", () => {
  it("tanpa pick", () => {
    const result = buildItemPickSummary([]);
    assert.strictEqual(result.size, 0);
  });

  it("satu item satu kondisi", () => {
    const picks = [
      { surat_jalan_item_id: 1, qty: 5, kondisi_diambil: "baik" },
    ];
    const result = buildItemPickSummary(picks);
    const summary = result.get(1);
    assert.strictEqual(summary.totalQty, 5);
    assert.deepStrictEqual(summary.kondisiList, [{ kondisi: "baik", qty: 5 }]);
  });

  it("multi kondisi per item", () => {
    const picks = [
      { surat_jalan_item_id: 1, qty: 3, kondisi_diambil: "baik" },
      { surat_jalan_item_id: 1, qty: 2, kondisi_diambil: "rusak_ringan" },
      { surat_jalan_item_id: 1, qty: 1, kondisi_diambil: "baik" },
    ];
    const result = buildItemPickSummary(picks);
    const summary = result.get(1);
    assert.strictEqual(summary.totalQty, 6);
    assert.deepStrictEqual(summary.kondisiList, [
      { kondisi: "baik", qty: 4 },
      { kondisi: "rusak_ringan", qty: 2 },
    ]);
  });
});

describe("buildItemPickSummary", () => {
  it("tanpa pick", () => {
    const result = buildItemPickSummary([]);
    assert.strictEqual(result.size, 0);
  });

  it("satu item satu kondisi", () => {
    const picks = [
      { surat_jalan_item_id: 1, qty: 5, kondisi_diambil: "baik" },
    ];
    const result = buildItemPickSummary(picks);
    const summary = result.get(1);
    assert.strictEqual(summary.totalQty, 5);
    assert.deepStrictEqual(summary.kondisiList, [{ kondisi: "baik", qty: 5 }]);
  });

  it("multi kondisi per item", () => {
    const picks = [
      { surat_jalan_item_id: 1, qty: 3, kondisi_diambil: "baik" },
      { surat_jalan_item_id: 1, qty: 2, kondisi_diambil: "rusak_ringan" },
      { surat_jalan_item_id: 1, qty: 1, kondisi_diambil: "baik" },
    ];
    const result = buildItemPickSummary(picks);
    const summary = result.get(1);
    assert.strictEqual(summary.totalQty, 6);
    assert.deepStrictEqual(summary.kondisiList, [
      { kondisi: "baik", qty: 4 },
      { kondisi: "rusak_ringan", qty: 2 },
    ]);
  });
});
