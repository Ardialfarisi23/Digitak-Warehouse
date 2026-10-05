const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildPickDecision, mapPickRow, buildItemPickSummary } = require("./surat-jalan.service");

const KONDISI_LABEL = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_berat: "Rusak Berat",
};

// Scope gudang untuk pemanggilan service di file test ini.
//
// Endpoint suratjalan yang dibatasi gudang (retrieve, putaway, receive-inbound,
// delivery-status, foto) menerima scope dari middleware `attachGudangScope`.
// Test di bawah memverifikasi logika lama yang tidak berubah, jadi scope-nya
// sengaja dibuat TANPA pembatasan — sama seperti yang diterima admin_general dan
// supervisor. Perilaku staf_gudang diuji terpisah di test middleware gudang-scope.
const SCOPE_BEBAS = { dibatasi: false, gudangIds: [], gudangUtamaId: null };

/** Membungkus service supaya scope gudang otomatis disuntikkan ke argumen terakhir. */
const denganScopeBebas = (fn) => (...args) => fn(...args, SCOPE_BEBAS);

function mockModule(modulePath, factory) {
  delete require.cache[require.resolve(modulePath)];
  require.cache[require.resolve(modulePath)] = {
    id: require.resolve(modulePath),
    filename: modulePath,
    loaded: true,
    exports: factory(),
  };
}

describe("retrieve", () => {
  let retrieve;
  let prismaMock;
  let repositoryMock;
  let capacityMock;
  let notificationMock;

  const baseShipment = {
    surat_jalan_id: 1,
    tipe: "outbound",
    status: "disetujui",
    gudang_asal_id: 1,
    project_id: 1,
    nomor_surat_jalan: "SJ-1",
    picking_selesai: false,
    items: [{ item_id: 1, barang_id: 1, qty: 10, kondisi: "baik" }],
  };

  function makeTx(shipment) {
    return {
      surat_jalan: {
        findUnique: async () => ({ ...shipment, picking_selesai: false }),
        updateMany: async () => ({ count: 1 }),
      },
      surat_jalan_item: {
        findMany: async () => shipment.items,
      },
      stok_gudang: {
        findFirst: async () => ({ stok_id: 1, qty: 10 }),
        findMany: async () => [],
        updateMany: async () => ({ count: 1 }),
        delete: async () => {},
      },
      zona_gudang: {
        findUnique: async () => ({ nama_zona: "Z1", kode_zona: "Z1" }),
      },
      stok_ledger: { create: async () => {} },
      surat_jalan_item_pick: { create: async () => {} },
      audit_log: { create: async () => {} },
    };
  }

  function setup(shipment = baseShipment) {
    delete require.cache[require.resolve("./surat-jalan.service")];
    prismaMock = {
      $transaction: async (fn) => fn(makeTx(shipment)),
      user_account: { findUnique: async () => ({ nama: "Actor", role: "staff" }) },
    };

    repositoryMock = {
      findById: async () => ({ ...shipment }),
      claimPicking: async () => true,
      createApprovalLog: async () => {},
    };

    capacityMock = { recalculateZonaStatus: async () => {} };
    notificationMock = { create: async () => {} };

    mockModule("../../config/prisma", () => prismaMock);
    mockModule("./surat-jalan.repository", () => repositoryMock);
    mockModule("../notifications/notifications.service", () => notificationMock);
    mockModule("../capacity/capacity.service", () => capacityMock);

    const service = require("./surat-jalan.service");
    retrieve = denganScopeBebas(service.retrieve);
  }

  function teardown() {
    delete require.cache[require.resolve("../../config/prisma")];
    delete require.cache[require.resolve("./surat-jalan.repository")];
    delete require.cache[require.resolve("../notifications/notifications.service")];
    delete require.cache[require.resolve("../capacity/capacity.service")];
    delete require.cache[require.resolve("./surat-jalan.service")];
  }

  it("normal pick: stok berkurang, ledger/pick dibuat, is_override=false", async () => {
    setup();
    const result = await retrieve(1, [{ item_id: 1, qty: 2, zona_id: 1, kondisi: "baik" }], 1);
    assert.ok(result);
    assert.strictEqual(result.surat_jalan_id, 1);
    teardown();
  });

  it("override tanpa catatan: is_override=true dengan catatan auto", async () => {
    const shipment = { ...baseShipment, items: [{ item_id: 1, barang_id: 1, qty: 10, kondisi: "baik" }] };
    setup(shipment);
    const tx = makeTx(shipment);
    tx.stok_gudang = {
      findFirst: async () => ({ stok_id: 2, qty: 10 }),
      findMany: async () => [],
      updateMany: async () => ({ count: 1 }),
      delete: async () => {},
    };
    prismaMock.$transaction = async (fn) => fn(tx);

    const result = await retrieve(1, [{ item_id: 1, qty: 2, zona_id: 1, kondisi: "rusak_ringan" }], 1);
    assert.ok(result);
    teardown();
  });

  it("over-pick: ditolak jika total qty melebihi qty SJ", async () => {
    setup();
    let error;
    try {
      await retrieve(1, [{ item_id: 1, qty: 20, zona_id: 1, kondisi: "baik" }], 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    assert.strictEqual(error.code, "OVER_PICK");
    teardown();
  });

  it("stok kurang saat decrement: ditolak, tidak ada ledger/pick", async () => {
    setup();
    const tx = makeTx(baseShipment);
    tx.stok_gudang.updateMany = async () => ({ count: 0 });
    prismaMock.$transaction = async (fn) => fn(tx);

    let error;
    try {
      await retrieve(1, [{ item_id: 1, qty: 2, zona_id: 1, kondisi: "baik" }], 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    assert.strictEqual(error.code, "INSUFFICIENT_STOCK");
    teardown();
  });

  it("status bukan disetujui: ditolak", async () => {
    const shipment = { ...baseShipment, status: "draft_diajukan" };
    setup(shipment);

    let error;
    try {
      await retrieve(1, [{ item_id: 1, qty: 2, zona_id: 1, kondisi: "baik" }], 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    assert.strictEqual(error.message, "Surat jalan tidak dalam status disetujui.");
    teardown();
  });
});

describe("buildPickDecision", () => {
  const base = {
    requestedKondisi: "baik",
    pickedKondisi: "baik",
    qty: 1,
    stockDiminta: { qty: 10 },
    stockDiambil: null,
    fallbackStocks: [],
    barangNama: "Barang A",
    zonaNama: "Zona 1",
    kondisiLabel: KONDISI_LABEL,
    catatanKondisi: null,
  };

  it("kondisi sesuai + stok cukup -> normal", () => {
    const result = buildPickDecision(base);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.mode, "normal");
    assert.strictEqual(result.isOverride, false);
    assert.strictEqual(result.catatanFinal, null);
  });

  it("override dengan alasan -> override", () => {
    const result = buildPickDecision({
      ...base,
      pickedKondisi: "rusak_ringan",
      stockDiminta: null,
      stockDiambil: { qty: 5 },
      catatanKondisi: "Stok Baik habis",
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.mode, "override");
    assert.strictEqual(result.isOverride, true);
    assert.strictEqual(result.catatanFinal, "Stok Baik habis");
  });

  it("override tanpa alasan -> auto catatan", () => {
    const result = buildPickDecision({
      ...base,
      pickedKondisi: "rusak_ringan",
      stockDiminta: null,
      stockDiambil: { qty: 5 },
      catatanKondisi: "",
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.mode, "override");
    assert.strictEqual(result.isOverride, true);
    assert.strictEqual(result.catatanFinal, "Auto: kondisi baik tidak tersedia, diambil rusak_ringan");
  });

  it("kondisi diminta kosong tanpa override -> no_stock dengan alternatif", () => {
    const result = buildPickDecision({
      ...base,
      stockDiminta: null,
      stockDiambil: null,
      fallbackStocks: [
        { kondisi: "rusak_ringan", qty: 2 },
        { kondisi: "baik", qty: 0 },
      ],
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, "NO_STOCK");
    assert.ok(result.message.includes("Tersedia: Rusak Ringan (2)"));
  });

  it("override stok kondisi_diambil tidak ada -> override_no_stock dengan alternatif", () => {
    const result = buildPickDecision({
      ...base,
      pickedKondisi: "rusak_ringan",
      stockDiminta: null,
      stockDiambil: null,
      fallbackStocks: [
        { kondisi: "rusak_berat", qty: 3 },
      ],
      catatanKondisi: "Stok Baik habis",
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, "OVERRIDE_NO_STOCK");
    assert.ok(result.message.includes("Tersedia: Rusak Berat (3)"));
  });

  it("qty <= 0 -> invalid_qty", () => {
    const result = buildPickDecision({
      ...base,
      qty: 0,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, "INVALID_QTY");
  });

  it("qty > stok -> insufficient_stock", () => {
    const result = buildPickDecision({
      ...base,
      stockDiminta: { qty: 2 },
      qty: 5,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, "INSUFFICIENT_STOCK");
  });

  it("tidak ada stok sama sekali -> no_stock tanpa alternatif", () => {
    const result = buildPickDecision({
      ...base,
      stockDiminta: null,
      stockDiambil: null,
      fallbackStocks: [],
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, "NO_STOCK");
    assert.ok(result.message.includes("Tidak ada stok kondisi lain di zona ini."));
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
      zonaId: 5,
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

  it("override pick dengan auto catatan", () => {
    const row = mapPickRow({
      suratJalanItemId: 3,
      gudangId: 10,
      zonaId: 5,
      requestedKondisi: "baik",
      pickedKondisi: "rusak_ringan",
      qty: 2,
      catatanKondisi: "Auto: kondisi baik tidak tersedia, diambil rusak_ringan",
      actorId: 1,
    });
    assert.strictEqual(row.kondisi_diminta, "baik");
    assert.strictEqual(row.kondisi_diambil, "rusak_ringan");
    assert.strictEqual(row.is_override, true);
    assert.strictEqual(row.catatan_override, "Auto: kondisi baik tidak tersedia, diambil rusak_ringan");
  });
});

describe("buildItemPickSummary", () => {
  it("item tanpa pick", () => {
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
    assert.deepEqual(summary.kondisiList, [{ kondisi: "baik", qty: 5 }]);
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
    assert.deepEqual(summary.kondisiList, [
      { kondisi: "baik", qty: 4 },
      { kondisi: "rusak_ringan", qty: 2 },
    ]);
  });
});

describe("updateDeliveryStatus", () => {
  let updateDeliveryStatus;
  let confirmDistributed;
  let prismaMock;
  let repositoryMock;

  const baseShipment = {
    surat_jalan_id: 1,
    tipe: "outbound",
    status: "disetujui",
    gudang_asal_id: 1,
    gudang_tujuan_id: 2,
    nomor_surat_jalan: "SJ-1",
    picking_selesai: true,
    catatan_distribusi: null,
    estimasi_tiba: null,
  };

  function makeTx(shipment) {
    return {
      surat_jalan: {
        updateMany: async () => ({ count: 1 }),
        update: async () => ({ ...shipment }),
      },
      surat_jalan_item: {
        update: async () => ({}),
      },
      surat_jalan_item_pick: {
        findMany: async () => [],
      },
      audit_log: { create: async () => {} },
    };
  }

  function setup(shipment = baseShipment) {
    delete require.cache[require.resolve("./surat-jalan.service")];
    prismaMock = {
      $transaction: async (fn) => fn(makeTx(shipment)),
      user_account: {
        findUnique: async () => ({ nama: "Actor", role: "supervisor" }),
        findMany: async () => [],
      },
      personil: { findMany: async () => [] },
    };

    repositoryMock = {
      findById: async () => ({ ...shipment }),
      createApprovalLog: async () => {},
    };

    mockModule("../../config/prisma", () => prismaMock);
    mockModule("./surat-jalan.repository", () => repositoryMock);
    mockModule("../notifications/notifications.service", () => ({ create: async () => {} }));
    mockModule("../capacity/capacity.service", () => ({ recalculateZonaStatus: async () => {} }));

    const service = require("./surat-jalan.service");
    updateDeliveryStatus = denganScopeBebas(service.updateDeliveryStatus);
    confirmDistributed = service.confirmDistributed;
  }

  function teardown() {
    delete require.cache[require.resolve("../../config/prisma")];
    delete require.cache[require.resolve("./surat-jalan.repository")];
    delete require.cache[require.resolve("../notifications/notifications.service")];
    delete require.cache[require.resolve("../capacity/capacity.service")];
    delete require.cache[require.resolve("./surat-jalan.service")];
  }

  it("disetujui -> sedang_dikirim: berhasil bila picking_selesai", async () => {
    setup();
    const result = await updateDeliveryStatus(1, { status: "sedang_dikirim" }, 1);
    assert.ok(result);
    teardown();
  });

  it("disetujui -> sedang_dikirim: ditolak bila picking_selesai false", async () => {
    const shipment = { ...baseShipment, picking_selesai: false };
    setup(shipment);
    let error;
    try {
      await updateDeliveryStatus(1, { status: "sedang_dikirim" }, 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    teardown();
  });

  // Laporan tiba staf kini langsung menutup SJ (keputusan bisnis): dari
  // sedang_dikirim boleh langsung ke diterima_didistribusikan.
  it("sedang_dikirim -> diterima_didistribusikan via updateDeliveryStatus: berhasil (laporan tiba staf)", async () => {
    const shipment = {
      ...baseShipment,
      status: "sedang_dikirim",
      items: [{ item_id: 1, barang_id: 1, qty: 10, kondisi: "baik" }],
    };
    setup(shipment);
    const result = await updateDeliveryStatus(
      1,
      { status: "diterima_didistribusikan", items: [{ item_id: 1, qty_diterima: 0, kondisi_diterima: "baik" }] },
      1
    );
    assert.ok(result);
    teardown();
  });

  it("mundur diterima -> sedang_dikirim: ditolak", async () => {
    const shipment = { ...baseShipment, status: "diterima_didistribusikan" };
    setup(shipment);
    let error;
    try {
      await updateDeliveryStatus(1, { status: "sedang_dikirim" }, 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    teardown();
  });

  it("status sama: return shipment tanpa error", async () => {
    const shipment = { ...baseShipment, status: "sedang_dikirim" };
    setup(shipment);
    const result = await updateDeliveryStatus(1, { status: "sedang_dikirim" }, 1);
    assert.ok(result);
    teardown();
  });

  it("update kondisional 0 baris: ditolak", async () => {
    setup();
    const tx = makeTx(baseShipment);
    tx.surat_jalan.updateMany = async () => ({ count: 0 });
    prismaMock.$transaction = async (fn) => fn(tx);

    let error;
    try {
      await updateDeliveryStatus(1, { status: "sedang_dikirim" }, 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    teardown();
  });

  it("confirmDistributed tanpa picking_selesai: ditolak", async () => {
    const shipment = { ...baseShipment, picking_selesai: false };
    setup(shipment);
    let error;
    try {
      await confirmDistributed(1, 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    teardown();
  });

  it("sedang_dikirim -> tiba_menunggu_konfirmasi: berhasil", async () => {
    const shipment = { ...baseShipment, status: "sedang_dikirim", items: [{ item_id: 1, barang_id: 1, qty: 10, kondisi: "baik" }] };
    setup(shipment);
    const tx = makeTx(shipment);
    tx.surat_jalan_item_pick = {
      findMany: async () => [{ surat_jalan_item_id: 1, qty: 5, kondisi_diambil: "baik" }],
    };
    prismaMock.$transaction = async (fn) => fn(tx);

    const result = await updateDeliveryStatus(1, { status: "tiba_menunggu_konfirmasi", items: [{ item_id: 1, qty_diterima: 5, kondisi_diterima: "baik" }] }, 1);
    assert.ok(result);
    teardown();
  });

  it("tiba_menunggu_konfirmasi -> diterima_didistribusikan via updateDeliveryStatus: ditolak", async () => {
    const shipment = { ...baseShipment, status: "tiba_menunggu_konfirmasi" };
    setup(shipment);
    let error;
    try {
      await updateDeliveryStatus(1, { status: "diterima_didistribusikan" }, 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    teardown();
  });

  it("lapor sampai: qty_diterima melebihi pick -> ditolak", async () => {
    const shipment = { ...baseShipment, status: "sedang_dikirim", items: [{ item_id: 1, barang_id: 1, qty: 10, kondisi: "baik" }] };
    setup(shipment);
    const tx = makeTx(shipment);
    tx.surat_jalan_item_pick = {
      findMany: async () => [{ surat_jalan_item_id: 1, qty: 5 }],
    };
    prismaMock.$transaction = async (fn) => fn(tx);

    let error;
    try {
      await updateDeliveryStatus(1, { status: "tiba_menunggu_konfirmasi", items: [{ item_id: 1, qty_diterima: 10, kondisi_diterima: "baik" }] }, 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    teardown();
  });

  it("confirmDistributed dari tiba_menunggu_konfirmasi tanpa selisih: berhasil", async () => {
    const shipment = { ...baseShipment, status: "tiba_menunggu_konfirmasi", items: [{ item_id: 1, barang_id: 1, qty: 10, kondisi: "baik", qty_diterima: 5, kondisi_diterima: "baik" }] };
    setup(shipment);
    const tx = makeTx(shipment);
    tx.surat_jalan.updateMany = async () => ({ count: 1 });
    tx.surat_jalan_item_pick = {
      findMany: async () => [{ surat_jalan_item_id: 1, qty: 5, kondisi_diambil: "baik" }],
    };
    prismaMock.$transaction = async (fn) => fn(tx);

    const result = await confirmDistributed(1, 1, "Qty sesuai.");
    assert.ok(result);
    teardown();
  });

  it("confirmDistributed dari tiba_menunggu_konfirmasi dengan selisih tanpa catatan: ditolak", async () => {
    const shipment = { ...baseShipment, status: "tiba_menunggu_konfirmasi", items: [{ item_id: 1, barang_id: 1, qty: 10, kondisi: "baik", qty_diterima: 3, kondisi_diterima: "baik" }] };
    setup(shipment);
    const tx = makeTx(shipment);
    tx.surat_jalan.updateMany = async () => ({ count: 1 });
    tx.surat_jalan_item_pick = {
      findMany: async () => [{ surat_jalan_item_id: 1, qty: 5, kondisi_diambil: "baik" }],
    };
    prismaMock.$transaction = async (fn) => fn(tx);

    let error;
    try {
      await confirmDistributed(1, 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    teardown();
  });

  it("confirmDistributed dari tiba_menunggu_konfirmasi dengan selisih + catatan: berhasil", async () => {
    const shipment = { ...baseShipment, status: "tiba_menunggu_konfirmasi", items: [{ item_id: 1, barang_id: 1, qty: 10, kondisi: "baik", qty_diterima: 3, kondisi_diterima: "baik" }] };
    setup(shipment);
    const tx = makeTx(shipment);
    tx.surat_jalan.updateMany = async () => ({ count: 1 });
    tx.surat_jalan_item_pick = {
      findMany: async () => [{ surat_jalan_item_id: 1, qty: 5, kondisi_diambil: "baik" }],
    };
    prismaMock.$transaction = async (fn) => fn(tx);

    const result = await confirmDistributed(1, 1, "Ada selisih qty, sudah dicek di site.");
    assert.ok(result);
    teardown();
  });

  it("confirmDistributed dari tiba_menunggu_konfirmasi kondisi tidak ada di pick tanpa catatan: ditolak", async () => {
    const shipment = { ...baseShipment, status: "tiba_menunggu_konfirmasi", items: [{ item_id: 1, barang_id: 1, qty: 10, kondisi: "baik", qty_diterima: 5, kondisi_diterima: "rusak_ringan" }] };
    setup(shipment);
    const tx = makeTx(shipment);
    tx.surat_jalan.updateMany = async () => ({ count: 1 });
    tx.surat_jalan_item_pick = {
      findMany: async () => [{ surat_jalan_item_id: 1, qty: 5, kondisi_diambil: "baik" }],
    };
    prismaMock.$transaction = async (fn) => fn(tx);

    let error;
    try {
      await confirmDistributed(1, 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    teardown();
  });

  it("confirmDistributed update kondisional 0 baris: ditolak", async () => {
    const shipment = { ...baseShipment, status: "tiba_menunggu_konfirmasi" };
    setup(shipment);
    const tx = makeTx(shipment);
    tx.surat_jalan.updateMany = async () => ({ count: 0 });
    prismaMock.$transaction = async (fn) => fn(tx);

    let error;
    try {
      await confirmDistributed(1, 1);
    } catch (err) {
      error = err;
    }
    assert.ok(error);
    teardown();
  });

  it("confirmDistributed status sama: idempotent", async () => {
    const shipment = { ...baseShipment, status: "diterima_didistribusikan" };
    setup(shipment);
    const result = await confirmDistributed(1, 1);
    assert.ok(result);
    teardown();
  });
});
