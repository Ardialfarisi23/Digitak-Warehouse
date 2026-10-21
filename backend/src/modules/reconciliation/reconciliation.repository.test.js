const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// Mock modul dependen sebelum memuat repository
const mockPrisma = {
  boq_item: { findMany: async () => [] },
  surat_jalan_item: { findMany: async () => [] },
  surat_jalan_item_pick: { groupBy: async () => [] },
  laporan_mitra: { findMany: async () => [] },
  barang: { findFirst: async () => null },
  reconciliation_remains_note: { findMany: async () => [] },
  cluster: { findMany: async () => [] },
};

const mockReturnRepo = {
  getApprovedReturnsAfterSnapshot: async () => 0,
  getLatestPhysicalSnapshot: async () => ({ snapshot: null, reason: "no snapshot" }),
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

const mockAdditionalRepo = {
  getAdditionalTotalsByProject: async () => new Map(),
  getAdditionalTotalsByCluster: async () => new Map(),
};

require.cache[require.resolve("../additional/additional.repository")] = {
  id: require.resolve("../additional/additional.repository"),
  filename: require.resolve("../additional/additional.repository"),
  loaded: true,
  exports: mockAdditionalRepo,
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

  // cluster_id is a hyphenated Text string (e.g. "NET-H-004396"). The clusterId
  // filter must compare the real agg.cluster_id, not a key.split("-")[0] fragment.
  const makeBoqItem = (clusterId, clusterNama, boqStatus) => ({
    boq_item_id: Number(clusterId.replace(/[^0-9]/g, "").slice(-3)) + (boqStatus === "selesai" ? 0 : 1000),
    barang_id: 218,
    qty_rencana: boqStatus === "selesai" ? 4 : 2,
    gudang_tujuan_id: null,
    boq: {
      boq_id: 10,
      boq_number: "BOQ-001",
      status: boqStatus,
      source: "top_down",
      cluster_id: clusterId,
      tiket_id: null,
      cluster: {
        cluster_id: clusterId,
        nama_cluster: clusterNama,
        cluster_type: "FTTH",
        project_type: null,
        alamat_lengkap: null,
        kso_partner: null,
        kso_contact: null,
        no_tiket_release: null,
        vendor: null,
        homepass_plan: null,
        status_aktif: true,
        project: { project_id: 17, cluster_id: clusterId, area: "Rancamanyar", nama_project: "FTTH OPEN AREA RANCAMANYAR" },
        pic: null,
      },
      tiket: {
        tiket_id: 5,
        kode_tiket: "TIKET-01",
        used: 0,
        project: { project_id: 17, nama_project: "FTTH OPEN AREA RANCAMANYAR", area: "Rancamanyar", cluster_id: clusterId },
      },
    },
    barang: { kode_perangkat: "K1", nama_barang: "ODP" },
    satuan: { kode_satuan: "pcs" },
    gudang_tujuan: { nama_gudang: "Gudang A" },
  });

  const boqItemsMock = [
    makeBoqItem("NET-H-004396", "FTTH Open Area Rancamanyar RW 01", "selesai"),
    makeBoqItem("NET-H-004397", "FTTH Open Area Rancamanyar RW 02", "aktif"),
  ];

  let originalBoqFindMany;
  let originalClusterFindMany;
  let originalShipmentFindMany;

  before(() => {
    originalBoqFindMany = mockPrisma.boq_item.findMany;
    originalClusterFindMany = mockPrisma.cluster.findMany;
    originalShipmentFindMany = mockPrisma.surat_jalan_item.findMany;
    mockPrisma.boq_item.findMany = async (args) => {
      if (args && args.select) return [];
      return boqItemsMock;
    };
    mockPrisma.cluster.findMany = async () => [];
  });

  after(() => {
    mockPrisma.boq_item.findMany = originalBoqFindMany;
    mockPrisma.cluster.findMany = originalClusterFindMany;
    mockPrisma.surat_jalan_item.findMany = originalShipmentFindMany;
  });

  beforeEach(() => {
    mockPrisma.surat_jalan_item.findMany = async () => [];
  });

  it("getInventory groupBy=cluster dengan clusterId bergaris mengembalikan hanya cluster yang dipilih", async () => {
    const result = await getInventory({ search: "", projectId: "17", warehouseId: "all", status: "all", groupBy: "cluster", clusterId: "NET-H-004396" });
    assert.ok(Array.isArray(result.data), "result.data harus array");
    assert.equal(result.data.length, 1, "harus ada tepat 1 baris untuk NET-H-004396");
    assert.equal(result.data[0].cluster_id, "NET-H-004396");
    assert.equal(result.data[0].nama_cluster, "FTTH Open Area Rancamanyar RW 01");
  });

  it("getInventory groupBy=cluster dengan clusterId lain hanya mengembalikan cluster itu", async () => {
    const result = await getInventory({ search: "", projectId: "17", warehouseId: "all", status: "all", groupBy: "cluster", clusterId: "NET-H-004397" });
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].cluster_id, "NET-H-004397");
  });

  it("getInventory groupBy=cluster tanpa clusterId mengembalikan semua cluster", async () => {
    const result = await getInventory({ search: "", projectId: "17", warehouseId: "all", status: "all", groupBy: "cluster", clusterId: "all" });
    assert.ok(result.data.length >= 2, "harus mengandung >= 2 cluster");
    const ids = result.data.map((r) => r.cluster_id);
    assert.ok(ids.includes("NET-H-004396") && ids.includes("NET-H-004397"));
  });

  it("getInventory groupBy=cluster dengan clusterId tidak ada mengembalikan 0 baris (bukan error)", async () => {
    const result = await getInventory({ search: "", projectId: "17", warehouseId: "all", status: "all", groupBy: "cluster", clusterId: "NET-H-999999" });
    assert.ok(Array.isArray(result.data));
    assert.equal(result.data.length, 0);
  });

  // --- MOS Inbound Tests ---
  const makeShipmentItem = (overrides = {}) => ({
    item_id: 1,
    barang_id: 218,
    qty: 10,
    surat_jalan: {
      surat_jalan_id: 100,
      tipe: "inbound",
      status: "disetujui",
      tipe_pengirim: "external",
      project_id: 17,
      cluster_id: "NET-H-004396",
      gudang_asal_id: null,
      gudang_tujuan_id: 5,
      boq_id: 10,
      tujuan_tipe: "gudang",
      boq: { cluster_id: "NET-H-004396" },
      ...overrides,
    },
  });

  it("MOS: inbound vendor dengan cluster_id & project_id -> MOS cluster bertambah", async () => {
    mockPrisma.surat_jalan_item.findMany = async () => [makeShipmentItem({ status: "diterima_didistribusikan" })];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    assert.ok(row, "row untuk cluster NET-H-004396 harus ada");
    assert.equal(row.mos, 10, "MOS harus 10 untuk inbound vendor dengan cluster_id");
  });

  it("MOS: inbound vendor 10 + outbound 15 -> MOS 10 (outbound tidak berpengaruh)", async () => {
    const inboundItem = makeShipmentItem({ qty: 10, status: "diterima_didistribusikan" });
    const outboundItem = { ...makeShipmentItem(), item_id: 2, qty: 15, surat_jalan: { ...makeShipmentItem().surat_jalan, tipe: "outbound", tujuan_tipe: "lapangan", tipe_pengirim: null } };
    mockPrisma.surat_jalan_item.findMany = async () => [inboundItem, outboundItem];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    assert.ok(row, "row untuk cluster NET-H-004396 harus ada");
    assert.equal(row.mos, 10, "MOS harus 10 (hanya inbound)");
  });

  it("MOS: hanya outbound 8 (tanpa inbound) -> MOS 0", async () => {
    const outboundItem = { ...makeShipmentItem(), item_id: 2, qty: 8, surat_jalan: { ...makeShipmentItem().surat_jalan, tipe: "outbound", tujuan_tipe: "lapangan", tipe_pengirim: null } };
    mockPrisma.surat_jalan_item.findMany = async () => [outboundItem];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    if (row) {
      assert.equal(row.mos, 0, "MOS harus 0 untuk hanya outbound");
    }
  });

  it("MOS: inbound internal/transfer gudang -> MOS 0", async () => {
    mockPrisma.surat_jalan_item.findMany = async () => [makeShipmentItem({ tipe_pengirim: "internal", gudang_asal_id: 1, gudang_tujuan_id: 5 })];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    if (row) {
      assert.equal(row.mos, 0, "MOS harus 0 untuk inbound internal");
    }
  });

  it("MOS: inbound tanpa project_id & cluster_id -> MOS tidak bertambah", async () => {
    mockPrisma.surat_jalan_item.findMany = async () => [makeShipmentItem({ cluster_id: null, project_id: null })];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    if (row) {
      assert.equal(row.mos, 0, "MOS harus 0 untuk inbound tanpa cluster_id/project_id");
    }
  });

  it("MOS: inbound status belum approved (menunggu_verifikasi) -> MOS tidak bertambah", async () => {
    mockPrisma.surat_jalan_item.findMany = async () => [makeShipmentItem({ status: "menunggu_verifikasi" })];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    if (row) {
      assert.equal(row.mos, 0, "MOS harus 0 untuk inbound status menunggu_verifikasi");
    }
  });

  it("MOS: inbound vendor external lama (tipe_pengirim=external, gudang_asal_id=null) -> tetap terhitung", async () => {
    mockPrisma.surat_jalan_item.findMany = async () => [makeShipmentItem({ tipe_pengirim: "external", gudang_asal_id: null, status: "diterima_didistribusikan" })];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    assert.ok(row, "row untuk cluster NET-H-004396 harus ada");
    assert.equal(row.mos, 10, "MOS harus 10 untuk inbound external lama");
  });

<<<<<<< HEAD
  it("MOS: inbound status ready_putaway (belum disetujui/diterima) -> MOS tidak bertambah", async () => {
=======
  it("MOS: inbound ready_putaway (belum di-putaway) -> MOS 0", async () => {
>>>>>>> c5036e8 (Fix:Beres Beres error dan Bug)
    mockPrisma.surat_jalan_item.findMany = async () => [makeShipmentItem({ status: "ready_putaway" })];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    if (row) {
<<<<<<< HEAD
      assert.equal(row.mos, 0, "MOS harus 0 untuk inbound ready_putaway");
    }
  });

  it("MOS: inbound status diterima_didistribusikan -> MOS bertambah", async () => {
    mockPrisma.surat_jalan_item.findMany = async () => [makeShipmentItem({ status: "diterima_didistribusikan" })];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    if (row) {
      assert.equal(row.mos, 10, "MOS harus 10 untuk inbound diterima_didistribusikan");
    }
  });
=======
      assert.equal(row.mos, 0, "MOS harus 0 untuk inbound belum di-putaway (ready_putaway)");
    }
  });

  it("MOS: inbound diterima_didistribusikan (putaway selesai) -> MOS naik tepat qty", async () => {
    const item = makeShipmentItem({ status: "diterima_didistribusikan" });
    item.qty = 7;
    mockPrisma.surat_jalan_item.findMany = async () => [item];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    assert.ok(row, "row harus ada untuk inbound yang sudah di-putaway");
    assert.equal(row.mos, 7, "MOS harus 7 tepat sesuai qty putaway");
  });

  it("MOS: outbound diterima_didistribusikan (konfirmasi lapangan) -> MOS 0, tidak berubah", async () => {
    const outboundItem = { ...makeShipmentItem(), item_id: 2, qty: 8, surat_jalan: { ...makeShipmentItem().surat_jalan, tipe: "outbound", tujuan_tipe: "lapangan", tipe_pengirim: null, status: "diterima_didistribusikan" } };
    mockPrisma.surat_jalan_item.findMany = async () => [outboundItem];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    if (row) {
      assert.equal(row.mos, 0, "MOS harus 0 untuk outbound (bukan bagian MOS)");
    }
  });

  it("MOS: inbound putaway + outbound lapangan -> tidak ada double counting, MOS = qty inbound saja", async () => {
    const inboundItem = makeShipmentItem({ status: "diterima_didistribusikan" });
    inboundItem.qty = 6;
    const outboundItem = { ...makeShipmentItem(), item_id: 2, qty: 6, surat_jalan: { ...makeShipmentItem().surat_jalan, tipe: "outbound", tujuan_tipe: "lapangan", tipe_pengirim: null, status: "diterima_didistribusikan" } };
    mockPrisma.surat_jalan_item.findMany = async () => [inboundItem, outboundItem];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    assert.ok(row, "row harus ada");
    assert.equal(row.mos, 6, "MOS harus 6 (hanya inbound putaway, tidak ditambah outbound)");
  });

  it("MOS: saldo awal boq_item.qty_mos tetap ditambahkan", async () => {
    mockPrisma.surat_jalan_item.findMany = async () => [];
    mockPrisma.boq_item.findMany = async () => [{
      boq_item_id: 100, barang_id: 218, qty_rencana: 0, qty_mos: 5, qty_additional: null, qty_used: null,
      boq: { cluster: { cluster_id: "NET-H-004396" }, cluster_id: "NET-H-004396", tiket: { project_id: 17 } },
    }];
    const result = await getInventory({ projectId: "17", groupBy: "cluster", clusterId: "all" });
    const row = result.data.find((r) => r.cluster_id === "NET-H-004396" && r.barang_id === "218");
    assert.ok(row, "row harus ada dari BOQ");
    assert.equal(row.mos, 5, "MOS harus 5 dari saldo awal qty_mos import");
  });
>>>>>>> c5036e8 (Fix:Beres Beres error dan Bug)
});
