const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const mockPrisma = {
  laporan_mitra: { findMany: async () => [] },
  return_transaction: { findMany: async () => [] },
};

require.cache[require.resolve("../../config/prisma")] = {
  id: require.resolve("../../config/prisma"),
  filename: require.resolve("../../config/prisma"),
  loaded: true,
  exports: mockPrisma,
};

const mockReturnUtils = {
  getBusinessDate: (date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  },
  toPrismaDecimal: (value) => {
    if (typeof value === 'number') return { toNumber: () => value, plus: (other) => mockReturnUtils.toPrismaDecimal(value + (typeof other === 'object' ? other.toNumber() : other)) };
    if (value && typeof value.toNumber === 'function') return value;
    return { toNumber: () => 0, plus: (other) => mockReturnUtils.toPrismaDecimal(0 + (typeof other === 'object' ? other.toNumber() : other)) };
  },
};

require.cache[require.resolve("../return/return.utils")] = {
  id: require.resolve("../return/return.utils"),
  filename: require.resolve("../return/return.utils"),
  loaded: true,
  exports: mockReturnUtils,
};

const { fetchApprovedReturnsBatch } = require("./reconciliation.repository");

describe("fetchApprovedReturnsBatch", () => {
  let originalLaporanFindMany;
  let originalReturnFindMany;

  before(() => {
    originalLaporanFindMany = mockPrisma.laporan_mitra.findMany;
    originalReturnFindMany = mockPrisma.return_transaction.findMany;
  });

  after(() => {
    mockPrisma.laporan_mitra.findMany = originalLaporanFindMany;
    mockPrisma.return_transaction.findMany = originalReturnFindMany;
  });

  it("pairs kosong mengembalikan Map kosong tanpa query", async () => {
    let called = false;
    mockPrisma.laporan_mitra.findMany = async () => { called = true; return []; };
    const result = await fetchApprovedReturnsBatch([]);
    assert.ok(result instanceof Map);
    assert.equal(result.size, 0);
    assert.equal(called, false);
  });

  it("deduplikasi pair sebelum query", async () => {
    let called = 0;
    mockPrisma.laporan_mitra.findMany = async () => { called++; return []; };
    const pairs = [
      ["1", "100"],
      ["1", "100"],
      ["2", "200"],
    ];
    await fetchApprovedReturnsBatch(pairs);
    assert.equal(called, 1, "hanya 1 query laporan_mitra meski ada duplikat");
  });

  it("tanpa snapshot mengembalikan 0 untuk pair tersebut", async () => {
    mockPrisma.laporan_mitra.findMany = async () => [];
    mockPrisma.return_transaction.findMany = async () => [];
    const result = await fetchApprovedReturnsBatch([["1", "100"]]);
    assert.equal(result.get("1-100") || 0, 0);
  });

  it("return tepat di tanggal snapshot TIDAK dihitung (operator >)", async () => {
    const snapshotDate = new Date("2026-01-15T10:00:00Z");
    mockPrisma.laporan_mitra.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: BigInt(100),
      tanggal_laporan: snapshotDate,
    }];
    mockPrisma.return_transaction.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: BigInt(100),
      qty: 5,
      effective_return_at: new Date("2026-01-15T10:00:00Z"), // sama dengan snapshot
    }];
    const result = await fetchApprovedReturnsBatch([["1", "100"]]);
    assert.equal(result.get("1-100") || 0, 0, "return pada tanggal snapshot tidak dihitung");
  });

  it("return sesudah snapshot dihitung", async () => {
    const snapshotDate = new Date("2026-01-15T10:00:00Z");
    mockPrisma.laporan_mitra.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: BigInt(100),
      tanggal_laporan: snapshotDate,
    }];
    mockPrisma.return_transaction.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: BigInt(100),
      qty: 5,
      effective_return_at: new Date("2026-01-16T10:00:00Z"), // hari berikutnya
    }];
    const result = await fetchApprovedReturnsBatch([["1", "100"]]);
    assert.equal(result.get("1-100") || 0, 5, "return sesudah snapshot dihitung");
  });

  it("multiple pair dijumlahkan terpisah per kunci", async () => {
    const snapshotDate = new Date("2026-01-15T10:00:00Z");
    mockPrisma.laporan_mitra.findMany = async () => [
      { tiket_id: BigInt(1), barang_id: BigInt(100), tanggal_laporan: snapshotDate },
      { tiket_id: BigInt(2), barang_id: BigInt(200), tanggal_laporan: snapshotDate },
    ];
    mockPrisma.return_transaction.findMany = async () => [
      { tiket_id: BigInt(1), barang_id: BigInt(100), qty: 3, effective_return_at: new Date("2026-01-16T10:00:00Z") },
      { tiket_id: BigInt(1), barang_id: BigInt(100), qty: 2, effective_return_at: new Date("2026-01-17T10:00:00Z") },
      { tiket_id: BigInt(2), barang_id: BigInt(200), qty: 7, effective_return_at: new Date("2026-01-16T10:00:00Z") },
    ];
    const result = await fetchApprovedReturnsBatch([["1", "100"], ["2", "200"]]);
    assert.equal(result.get("1-100") || 0, 5);
    assert.equal(result.get("2-200") || 0, 7);
  });

  it("status approved filter: hanya disetujui dan diterima_gudang", async () => {
    const snapshotDate = new Date("2026-01-15T10:00:00Z");
    mockPrisma.laporan_mitra.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: BigInt(100),
      tanggal_laporan: snapshotDate,
    }];
    // Mock hanya mengembalikan yang di-filter oleh Prisma (disetujui, diterima_gudang)
    mockPrisma.return_transaction.findMany = async () => [
      { tiket_id: BigInt(1), barang_id: BigInt(100), qty: 10, effective_return_at: new Date("2026-01-16T10:00:00Z"), status: "disetujui" },
      { tiket_id: BigInt(1), barang_id: BigInt(100), qty: 5, effective_return_at: new Date("2026-01-16T10:00:00Z"), status: "diterima_gudang" },
      // status "diajukan" tidak dikembalikan karena Prisma filter di where
    ];
    const result = await fetchApprovedReturnsBatch([["1", "100"]]);
    assert.equal(result.get("1-100") || 0, 15, "hanya status disetujui dan diterima_gudang");
  });

  it("chunking > 500 pairs: split into multiple queries", async () => {
    const snapshotDate = new Date("2026-01-15T10:00:00Z");
    const manyPairs = [];
    const expectedSnapshots = [];
    for (let i = 0; i < 600; i++) {
      manyPairs.push([String(i + 1), "100"]);
      expectedSnapshots.push({
        tiket_id: BigInt(i + 1),
        barang_id: BigInt(100),
        tanggal_laporan: snapshotDate,
      });
    }
    let queryCount = 0;
    mockPrisma.laporan_mitra.findMany = async (args) => {
      queryCount++;
      // Return only the chunk for this query
      const chunkIdx = queryCount - 1;
      return expectedSnapshots.slice(chunkIdx * 500, (chunkIdx + 1) * 500);
    };
    mockPrisma.return_transaction.findMany = async () => [];
    await fetchApprovedReturnsBatch(manyPairs);
    assert.equal(queryCount, 2, "600 pairs harus dipecah jadi 2 query (500 + 100)");
  });

  it("jumlahkan qty dengan presisi Decimal: 0.1 + 0.2 = 0.3", async () => {
    const snapshotDate = new Date("2026-01-15T10:00:00Z");
    mockPrisma.laporan_mitra.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: BigInt(100),
      tanggal_laporan: snapshotDate,
    }];
    mockPrisma.return_transaction.findMany = async () => [
      { tiket_id: BigInt(1), barang_id: BigInt(100), qty: 0.1, effective_return_at: new Date("2026-01-16T10:00:00Z") },
      { tiket_id: BigInt(1), barang_id: BigInt(100), qty: 0.2, effective_return_at: new Date("2026-01-17T10:00:00Z") },
    ];
    const result = await fetchApprovedReturnsBatch([["1", "100"]]);
    assert.equal(result.get("1-100") || 0, 0.3, "0.1 + 0.2 harus 0.3, bukan 0.30000000000000004");
  });

  it("snapshot barang_id null dengan nama_barang cocok -> dipakai sebagai snapshot pair", async () => {
    const snapshotDate = new Date("2026-01-15T10:00:00Z");
    mockPrisma.laporan_mitra.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: null,
      nama_barang: "Kabel Fiber",
      tanggal_laporan: snapshotDate,
    }];
    mockPrisma.return_transaction.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: BigInt(100),
      qty: 5,
      effective_return_at: new Date("2026-01-16T10:00:00Z"),
    }];
    // Pair dikirim dengan nama_barang "Kabel Fiber"
    const result = await fetchApprovedReturnsBatch([["1", "100", "Kabel Fiber"]]);
    assert.equal(result.get("1-100") || 0, 5, "snapshot dengan barang_id=null & nama_barang cocok harus dipakai");
  });

  it("ada snapshot barang_id dan snapshot nama_barang pada pair sama -> yang terbaru menang", async () => {
    const oldSnapshotDate = new Date("2026-01-10T10:00:00Z"); // lebih lama
    const newSnapshotDate = new Date("2026-01-15T10:00:00Z"); // lebih baru
    mockPrisma.laporan_mitra.findMany = async () => [
      // Snapshot lama dengan barang_id match
      { tiket_id: BigInt(1), barang_id: BigInt(100), tanggal_laporan: oldSnapshotDate },
      // Snapshot baru dengan barang_id=null + nama_barang match
      { tiket_id: BigInt(1), barang_id: null, nama_barang: "Kabel Fiber", tanggal_laporan: newSnapshotDate },
    ];
    mockPrisma.return_transaction.findMany = async () => [
      { tiket_id: BigInt(1), barang_id: BigInt(100), qty: 5, effective_return_at: new Date("2026-01-16T10:00:00Z") },
    ];
    const result = await fetchApprovedReturnsBatch([["1", "100", "Kabel Fiber"]]);
    // Return sesudah snapshot TERBARU (newSnapshotDate) -> dihitung
    assert.equal(result.get("1-100") || 0, 5, "harus pakai snapshot terbaru (nama_barang), bukan yang lama (barang_id)");
  });

  it("pair dengan namaBarang null/undefined -> snapshot barang_id null TIDAK ikut dipakai", async () => {
    const snapshotDate = new Date("2026-01-15T10:00:00Z");
    mockPrisma.laporan_mitra.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: null,
      nama_barang: "Kabel Fiber",
      tanggal_laporan: snapshotDate,
    }];
    mockPrisma.return_transaction.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: BigInt(100),
      qty: 5,
      effective_return_at: new Date("2026-01-16T10:00:00Z"),
    }];
    // Pair dikirim DENGAN nama_barang null/undefined (hanya tiketId, barangId)
    const result = await fetchApprovedReturnsBatch([["1", "100"]]); // tanpa namaBarang
    // Query tidak boleh menyertakan kondisi nama_barang, jadi snapshot barang_id=null tidak ditemukan
    assert.equal(result.get("1-100") || 0, 0, "tanpa namaBarang, snapshot barang_id=null tidak boleh dipakai");
  });

  it("nama berbeda kapitalisasi -> TIDAK cocok (exact match ===)", async () => {
    const snapshotDate = new Date("2026-01-15T10:00:00Z");
    mockPrisma.laporan_mitra.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: null,
      nama_barang: "Kabel Fiber", // kapitalisasi berbeda
      tanggal_laporan: snapshotDate,
    }];
    mockPrisma.return_transaction.findMany = async () => [{
      tiket_id: BigInt(1),
      barang_id: BigInt(100),
      qty: 5,
      effective_return_at: new Date("2026-01-16T10:00:00Z"),
    }];
    // Pair dikirim dengan "kabel fiber" (lowercase) - harus TIDAK cocok
    const result = await fetchApprovedReturnsBatch([["1", "100", "kabel fiber"]]);
    assert.equal(result.get("1-100") || 0, 0, "nama_barang harus cocok persis (case-sensitive), lowercase != Kapital");
  });
});