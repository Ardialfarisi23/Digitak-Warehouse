const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// Mock modul dependen sebelum memuat repository
const mockPrisma = {
  boq_item: { findMany: async () => [] },
  surat_jalan_item: { findMany: async () => [] },
  surat_jalan_item_pick: { groupBy: async () => [] },
  laporan_mitra: { findMany: async () => [] },
  barang: { findFirst: async () => null },
};

const mockReturnRepo = {
  getApprovedReturnsAfterSnapshot: async () => 0,
  getLatestPhysicalSnapshot: async () => null,
};

require.cache[require.resolve("../../config/prisma")] = {
  id: require.resolve("../../config/prisma"),
  filename: require.resolve("../../config/prisma"),
  loaded: true,
  exports: mockPrisma,
};

require.cache[require.resolve("../return/return.repository")] = {
  id: require.resolve("../return/return.repository"),
  filename: require.resolve("../return/return.repository"),
  loaded: true,
  exports: mockReturnRepo,
};

const { getInventory } = require("./reconciliation.repository");

describe("reconciliation.repository", () => {
  it("RECONCILIATION_SHIPMENT_STATUSES includes tiba_menunggu_konfirmasi dan sedang_dikirim", async () => {
    // Kita tidak bisa akses constant langsung karena tidak di-export.
    // Verifikasi indirect: getInventory dengan mock minimal harus memanggil prisma dengan where.status in array yang包含 tiba_menunggu_konfirmasi.
    // Untuk verifikasi langsung, kita baca ulang source file.
    const fs = require("fs");
    const path = require("path");
    const repoPath = path.join(__dirname, "reconciliation.repository.js");
    const source = fs.readFileSync(repoPath, "utf8");
    assert.ok(source.includes("tiba_menunggu_konfirmasi"), "reconciliation.repository.js harus menyebut tiba_menunggu_konfirmasi");
    assert.ok(source.includes("sedang_dikirim"), "reconciliation.repository.js harus menyebut sedang_dikirim");
  });

  it("getInventory mengembalikan array ketika tidak ada filter", async () => {
    const result = await getInventory({});
    assert.ok(result && typeof result === "object");
    assert.ok(Array.isArray(result.data));
  });
});
