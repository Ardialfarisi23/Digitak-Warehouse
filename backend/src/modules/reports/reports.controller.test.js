// Pengujian level controller untuk soft delete laporan mitra (BB-LMT-17)
// dan pemisahan daftar aktif/nonaktif (BB-LMT-18).
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

function mockModule(modulePath, factory) {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  require.cache[resolved] = {
    id: resolved,
    filename: modulePath,
    loaded: true,
    exports: factory(),
  };
}

function buatResMock() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

describe("reports.controller - laporan mitra", () => {
  let prismaMock;
  let refreshTiketMosUsedMock;
  let controller;

  const laporanAktif = {
    laporan_id: 12n,
    tiket_id: 7n,
    kode_tiket: "TKT-001",
    project_id: 3n,
    barang_id: 9n,
    nama_barang: "Laptop",
    pic_mitra: "Mitra A",
    tanggal_laporan: new Date("2026-01-15T00:00:00.000Z"),
    jenis_laporan: "pengambilan",
    used: 5,
    mos: 3,
    is_aktif: true,
  };

  beforeEach(() => {
    prismaMock = {
      laporan_mitra: {
        findUnique: async () => ({ ...laporanAktif }),
        update: async () => ({ ...laporanAktif, is_aktif: false }),
        findMany: async () => [],
        count: async () => 0,
      },
      audit_log: {
        create: async () => ({ audit_id: 1n }),
      },
      $transaction: async (fn) => fn(prismaMock),
    };

    refreshTiketMosUsedMock = async () => ({});

    mockModule("../../config/prisma", () => prismaMock);
    mockModule("../reconciliation/reconciliation.service", () => ({
      refreshTiketMosUsed: refreshTiketMosUsedMock,
    }));

    delete require.cache[require.resolve("./reports.controller")];
    controller = require("./reports.controller");
  });

  afterEach(() => {
    delete require.cache[require.resolve("./reports.controller")];
  });

  describe("BB-LMT-17: deactivateReconciliationReport", () => {
    it("menolak permintaan tanpa alasan dengan status 400", async () => {
      const res = buatResMock();
      await controller.deactivateReconciliationReport(
        { user: { id: "1" }, params: { laporan_id: "12" }, body: { alasan: "   " } },
        res,
        () => {}
      );

      assert.equal(res.statusCode, 400);
      assert.equal(res.payload.success, false);
      assert.match(res.payload.message, /Alasan wajib diisi/);
    });

    it("menolak ID laporan yang tidak valid dengan status 400", async () => {
      const res = buatResMock();
      await controller.deactivateReconciliationReport(
        { user: { id: "1" }, params: { laporan_id: "abc" }, body: { alasan: "salah input" } },
        res,
        () => {}
      );

      assert.equal(res.statusCode, 400);
      assert.match(res.payload.message, /ID laporan tidak valid/);
    });

    it("mengembalikan 404 saat laporan tidak ditemukan", async () => {
      prismaMock.laporan_mitra.findUnique = async () => null;
      const res = buatResMock();
      await controller.deactivateReconciliationReport(
        { user: { id: "1" }, params: { laporan_id: "12" }, body: { alasan: "salah input" } },
        res,
        () => {}
      );

      assert.equal(res.statusCode, 404);
      assert.match(res.payload.message, /tidak ditemukan/);
    });

    it("soft delete: set is_aktif=false, catat audit log, dan refresh agregasi tiket", async () => {
      const auditCalls = [];
      prismaMock.audit_log.create = async ({ data }) => {
        auditCalls.push(data);
        return { audit_id: 1n };
      };
      const updateCalls = [];
      prismaMock.laporan_mitra.update = async (args) => {
        updateCalls.push(args);
        return { ...laporanAktif, is_aktif: false };
      };

      const res = buatResMock();
      await controller.deactivateReconciliationReport(
        { user: { id: "1" }, params: { laporan_id: "12" }, body: { alasan: "salah input angka used" } },
        res,
        () => {}
      );

      assert.equal(res.statusCode, 200);
      assert.equal(res.payload.success, true);
      assert.equal(res.payload.data.is_aktif, false);

      assert.equal(updateCalls.length, 1);
      assert.equal(updateCalls[0].data.is_aktif, false);

      assert.equal(auditCalls.length, 1);
      assert.equal(auditCalls[0].entity_type, "laporan_mitra");
      assert.equal(auditCalls[0].aksi, "soft_delete");
      assert.equal(auditCalls[0].entity_id, 12n);
      assert.equal(auditCalls[0].actor_id, 1n);
      assert.equal(auditCalls[0].data_sebelum.is_aktif, true);
      assert.equal(auditCalls[0].data_sesudah.is_aktif, false);
      assert.equal(auditCalls[0].data_sesudah.alasan, "salah input angka used");

      assert.equal(refreshTiketMosUsedMock.mock?.calls?.length ?? 1, 1);
    });

    it("idempoten: laporan yang sudah nonaktif tidak error dan tidak menulis audit log baru", async () => {
      prismaMock.laporan_mitra.findUnique = async () => ({ ...laporanAktif, is_aktif: false });
      const auditCalls = [];
      prismaMock.audit_log.create = async ({ data }) => {
        auditCalls.push(data);
        return { audit_id: 1n };
      };
      let updateDipanggil = false;
      prismaMock.laporan_mitra.update = async () => {
        updateDipanggil = true;
        return { ...laporanAktif, is_aktif: false };
      };

      const res = buatResMock();
      await controller.deactivateReconciliationReport(
        { user: { id: "1" }, params: { laporan_id: "12" }, body: { alasan: "salah input" } },
        res,
        () => {}
      );

      assert.equal(res.statusCode, 200);
      assert.equal(res.payload.success, true);
      assert.equal(res.payload.data.is_aktif, false);
      assert.match(res.payload.message, /sudah berstatus nonaktif/);
      assert.equal(updateDipanggil, false);
      assert.equal(auditCalls.length, 0);
    });
  });

  describe("BB-LMT-18: getReconciliationReports", () => {
    function reqMock({ role, query = {} }) {
      return { user: { id: "1", role }, query };
    }

    it("hanya admin yang boleh meminta include_inactive; role lain tetap hanya laporan aktif", async () => {
      const whereDipakai = [];
      prismaMock.laporan_mitra.findMany = async ({ where }) => {
        whereDipakai.push(where);
        return [];
      };

      const resAdmin = buatResMock();
      await controller.getReconciliationReports(
        reqMock({ role: "admin_general", query: { include_inactive: "true" } }),
        resAdmin,
        () => {}
      );
      assert.equal(whereDipakai[0].is_aktif, undefined);

      const resSupervisor = buatResMock();
      await controller.getReconciliationReports(
        reqMock({ role: "supervisor", query: { include_inactive: "true" } }),
        resSupervisor,
        () => {}
      );
      assert.equal(whereDipakai[1].is_aktif, true);

      const resStaf = buatResMock();
      await controller.getReconciliationReports(
        reqMock({ role: "staf_gudang", query: {} }),
        resStaf,
        () => {}
      );
      assert.equal(whereDipakai[2].is_aktif, true);
    });

    it("admin tanpa include_inactive tetap hanya menerima laporan aktif", async () => {
      const whereDipakai = [];
      prismaMock.laporan_mitra.findMany = async ({ where }) => {
        whereDipakai.push(where);
        return [];
      };

      const res = buatResMock();
      await controller.getReconciliationReports(reqMock({ role: "admin_general", query: {} }), res, () => {});

      assert.equal(whereDipakai[0].is_aktif, true);
    });
  });
});
