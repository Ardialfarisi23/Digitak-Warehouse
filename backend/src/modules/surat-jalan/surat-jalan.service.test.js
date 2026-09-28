const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildPickDecision } = require("./surat-jalan.service");

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
