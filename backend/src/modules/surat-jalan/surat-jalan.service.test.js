const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildPickDecision, mapPickRow } = require("./surat-jalan.service");

const KONDISI_LABEL = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
};

describe("buildPickDecision", () => {
  const base = {
    requestedKondisi: "baik",
    pickedKondisi: "baik",
    catatanKondisi: null,
    stock: { qty: 10 },
    fallbackStocks: [],
    qty: 1,
    barangNama: "Barang A",
    zonaNama: "Zona 1",
    kondisiLabel: KONDISI_LABEL,
  };

  it("kondisi sesuai + stok cukup -> ok", () => {
    const result = buildPickDecision(base);
    assert.strictEqual(result.ok, true);
  });

  it("override sah dengan alasan", () => {
    const result = buildPickDecision({
      ...base,
      pickedKondisi: "rusak_ringan",
      catatanKondisi: "Stok Baik habis",
      stock: { qty: 5 },
    });
    assert.strictEqual(result.ok, true);
  });

  it("override tanpa alasan -> error", () => {
    const result = buildPickDecision({
      ...base,
      pickedKondisi: "rusak_ringan",
      catatanKondisi: "",
      stock: { qty: 5 },
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, "OVERRIDE_REASON_REQUIRED");
  });

  it("kondisi alternatif stok kurang -> error", () => {
    const result = buildPickDecision({
      ...base,
      pickedKondisi: "rusak_ringan",
      catatanKondisi: "Stok Baik habis",
      stock: null,
      fallbackStocks: [{ kondisi: "rusak_ringan", qty: 2 }],
      qty: 5,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, "OVERRIDE_NO_STOCK");
  });

  it("qty > stok -> error", () => {
    const result = buildPickDecision({
      ...base,
      stock: { qty: 2 },
      qty: 5,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, "INSUFFICIENT_STOCK");
  });

  it("tidak ada stok sama sekali -> error", () => {
    const result = buildPickDecision({
      ...base,
      stock: null,
      fallbackStocks: [],
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, "NO_STOCK");
  });
});

describe("mapPickRow", () => {
  it("normal pick tanpa override", () => {
    const row = mapPickRow({
      suratJalanItemId: 1,
      gudangId: 10,
      zonaId: 5,
      requestedKondisi: "baik",
      pickedKondisi: "baik",
      qty: 3,
      catatanKondisi: null,
      actorId: 99,
    });
    assert.strictEqual(row.surat_jalan_item_id, 1);
    assert.strictEqual(row.gudang_id, 10);
    assert.strictEqual(row.zona_id, 5);
    assert.strictEqual(row.kondisi_diminta, "baik");
    assert.strictEqual(row.kondisi_diambil, "baik");
    assert.strictEqual(row.qty, 3);
    assert.strictEqual(row.is_override, false);
    assert.strictEqual(row.catatan_override, null);
    assert.strictEqual(row.picked_by?.toString(), "99");
  });

  it("override pick dengan alasan", () => {
    const row = mapPickRow({
      suratJalanItemId: 2,
      gudangId: 10,
      zonaId: null,
      requestedKondisi: "baik",
      pickedKondisi: "rusak_ringan",
      qty: 1,
      catatanKondisi: "Stok Baik habis",
      actorId: 42,
    });
    assert.strictEqual(row.kondisi_diminta, "baik");
    assert.strictEqual(row.kondisi_diambil, "rusak_ringan");
    assert.strictEqual(row.is_override, true);
    assert.strictEqual(row.catatan_override, "Stok Baik habis");
    assert.strictEqual(row.picked_by?.toString(), "42");
  });
});
