// Pengujian level rute untuk hak akses endpoint laporan mitra (Batch 1 K12/K2).
// Nama pengujian: BB-LMT-13 (input laporan mitra admin-only) dan
// BB-LMT-17 (nonaktifkan laporan mitra admin-only).
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");

const ROLE_ADMIN = "admin_general";
const ROLE_SUPERVISOR = "supervisor";
const ROLE_STAFF = "staf_gudang";

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

// Controller palsu: mencatat pemanggilan dan membalas 200 agar rute teruji
// hanya pada lapisan otorisasi (bukan logika bisnis).
function buatControllerMock() {
  const calls = [];
  const stub = (nama) => async (req, res) => {
    calls.push({ nama, params: req.params, query: req.query, body: req.body });
    return res.status(200).json({ success: true, data: { stub: nama } });
  };

  return {
    calls,
    getStockHistory: stub("getStockHistory"),
    exportStockHistoryExcel: stub("exportStockHistoryExcel"),
    getAuditLogs: stub("getAuditLogs"),
    exportAuditLogExcel: stub("exportAuditLogExcel"),
    getHardwareReconciliation: stub("getHardwareReconciliation"),
    getHardwareReconciliationPerTiket: stub("getHardwareReconciliationPerTiket"),
    getHardwareReconciliationDetailed: stub("getHardwareReconciliationDetailed"),
    getZoneUtilizationHistory: stub("getZoneUtilizationHistory"),
    getZoneUtilization: stub("getZoneUtilization"),
    downloadReconciliationTemplate: stub("downloadReconciliationTemplate"),
    backfillReconciliation: stub("backfillReconciliation"),
    uploadReconciliationFile: stub("uploadReconciliationFile"),
    confirmReconciliationUpload: stub("confirmReconciliationUpload"),
    getReconciliationReports: stub("getReconciliationReports"),
    deactivateReconciliationReport: stub("deactivateReconciliationReport"),
    getReconciliationUploadLogs: stub("getReconciliationUploadLogs"),
    getReconciliationUploadLogBarang: stub("getReconciliationUploadLogBarang"),
    getReconciliationUploadLogFilterOptions: stub("getReconciliationUploadLogFilterOptions"),
  };
}

describe("Rute laporan mitra - hak akses Admin", () => {
  let controllerMock;
  let app;
  let server;
  let baseUrl;
  let errorLogAsli;

  before(async () => {
    controllerMock = buatControllerMock();

    // Middleware autentikasi palsu: role diambil dari header x-test-role.
    mockModule("../../middlewares/auth.middleware", () => (req, res, next) => {
      const role = req.headers["x-test-role"];
      if (!role) {
        return res.status(401).json({ success: false, message: "Token tidak ditemukan." });
      }
      req.user = { id: "1", email: "test@example.com", role };
      return next();
    });

    // Controller modul di-mock agar tidak menyentuh database.
    mockModule("./reports.controller", () => controllerMock);

    // Rate limiter dimock menjadi no-op.
    mockModule("../../middlewares/rate-limit", () => ({
      uploadLimiter: (req, res, next) => next(),
    }));

    // Prisma dimock supaya audit log role mismatch tidak menyentuh database.
    mockModule("../../config/prisma", () => ({
      audit_log: { create: async () => ({}) },
    }));

    delete require.cache[require.resolve("./reports.routes")];
    const router = require("./reports.routes");

    app = express();
    app.use(express.json());
    app.use("/api/reports", router);
    app.use(require("../../middlewares/error.middleware"));

    // Hilangkan log error middleware agar output test tetap bersih.
    errorLogAsli = console.error;
    console.error = () => {};

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    console.error = errorLogAsli;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    delete require.cache[require.resolve("./reports.routes")];
  });

  beforeEach(() => {
    controllerMock.calls.length = 0;
  });

  async function call(method, path, role, body) {
    const headers = { "x-test-role": role };
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, body: json };
  }

  const namaControllerDipanggil = () => controllerMock.calls.map((c) => c.nama);

  describe("BB-LMT-13: input laporan mitra (template, upload, konfirmasi) hanya Admin", () => {
    const endpoint = [
      { method: "GET", path: "/api/reports/reconciliation/template", controller: "downloadReconciliationTemplate" },
      { method: "POST", path: "/api/reports/reconciliation/upload", controller: "uploadReconciliationFile" },
      { method: "POST", path: "/api/reports/reconciliation/confirm", controller: "confirmReconciliationUpload" },
    ];

    for (const ep of endpoint) {
      it(`${ep.method} ${ep.path} menolak supervisor dengan 403`, async () => {
        const res = await call(ep.method, ep.path, ROLE_SUPERVISOR, ep.method === "POST" ? {} : undefined);
        assert.equal(res.status, 403);
        assert.equal(res.body?.success, false);
        assert.ok(!namaControllerDipanggil().includes(ep.controller));
      });

      it(`${ep.method} ${ep.path} menolak staf gudang dengan 403`, async () => {
        const res = await call(ep.method, ep.path, ROLE_STAFF, ep.method === "POST" ? {} : undefined);
        assert.equal(res.status, 403);
        assert.equal(res.body?.success, false);
        assert.ok(!namaControllerDipanggil().includes(ep.controller));
      });

      it(`${ep.method} ${ep.path} mengizinkan admin_general`, async () => {
        const res = await call(ep.method, ep.path, ROLE_ADMIN, ep.method === "POST" ? {} : undefined);
        assert.equal(res.status, 200);
        assert.ok(namaControllerDipanggil().includes(ep.controller));
      });
    }

    // K12: ekspektasi baru - Supervisor tidak bisa menginput laporan mitra.
    it("Supervisor tidak bisa menginput upload Excel (POST /reconciliation/upload)", async () => {
      const res = await call("POST", "/api/reports/reconciliation/upload", ROLE_SUPERVISOR, {});
      assert.equal(res.status, 403);
      assert.equal(res.body?.success, false);
      assert.ok(!namaControllerDipanggil().includes("uploadReconciliationFile"));
    });

    it("Supervisor tidak bisa menginput manual (POST /reconciliation/confirm)", async () => {
      const payloadManual = {
        filename: "manual-input",
        preview: [
          {
            kode_tiket: "T-001",
            nama_barang: "ODP",
            used: 1,
            mos: 0,
            tanggal_laporan: "2026-10-20",
            pic_mitra: "Mitra uji",
          },
        ],
        failed: [],
      };
      const res = await call("POST", "/api/reports/reconciliation/confirm", ROLE_SUPERVISOR, payloadManual);
      assert.equal(res.status, 403);
      assert.equal(res.body?.success, false);
      assert.ok(!namaControllerDipanggil().includes("confirmReconciliationUpload"));
    });
  });

  describe("Riwayat upload laporan mitra: Admin & Supervisor boleh baca, staf gudang ditolak", () => {
    const endpoint = [
      { method: "GET", path: "/api/reports/reconciliation-upload-logs", controller: "getReconciliationUploadLogs" },
      { method: "GET", path: "/api/reports/reconciliation-upload-logs/filter-options", controller: "getReconciliationUploadLogFilterOptions" },
      { method: "GET", path: "/api/reports/reconciliation-upload-logs/7/barang", controller: "getReconciliationUploadLogBarang" },
    ];

    for (const ep of endpoint) {
      it(`${ep.method} ${ep.path} mengizinkan supervisor`, async () => {
        const res = await call(ep.method, ep.path, ROLE_SUPERVISOR);
        assert.equal(res.status, 200);
        assert.ok(namaControllerDipanggil().includes(ep.controller));
      });

      it(`${ep.method} ${ep.path} menolak staf gudang dengan 403`, async () => {
        const res = await call(ep.method, ep.path, ROLE_STAFF);
        assert.equal(res.status, 403);
        assert.equal(res.body?.success, false);
        assert.ok(!namaControllerDipanggil().includes(ep.controller));
      });
    }
  });

  describe("BB-LMT-17: nonaktifkan laporan mitra hanya Admin", () => {
    const path = "/api/reports/reconciliation/laporan-mitra/12/nonaktifkan";

    it("menolak supervisor dengan 403 dan tidak memanggil controller", async () => {
      const res = await call("POST", path, ROLE_SUPERVISOR, { alasan: "salah input" });
      assert.equal(res.status, 403);
      assert.equal(res.body?.success, false);
      assert.ok(!namaControllerDipanggil().includes("deactivateReconciliationReport"));
    });

    it("menolak staf gudang dengan 403 dan tidak memanggil controller", async () => {
      const res = await call("POST", path, ROLE_STAFF, { alasan: "salah input" });
      assert.equal(res.status, 403);
      assert.equal(res.body?.success, false);
      assert.ok(!namaControllerDipanggil().includes("deactivateReconciliationReport"));
    });

    it("mengizinkan admin_general", async () => {
      const res = await call("POST", path, ROLE_ADMIN, { alasan: "salah input" });
      assert.equal(res.status, 200);
      assert.ok(namaControllerDipanggil().includes("deactivateReconciliationReport"));
    });

    it("daftar laporan mitra tetap boleh dibuka admin dan supervisor, tetapi ditolak staf", async () => {
      const listPath = "/api/reports/reconciliation/laporan-mitra";

      const adminRes = await call("GET", listPath, ROLE_ADMIN);
      assert.equal(adminRes.status, 200);
      assert.ok(namaControllerDipanggil().includes("getReconciliationReports"));

      const supervisorRes = await call("GET", listPath, ROLE_SUPERVISOR);
      assert.equal(supervisorRes.status, 200);

      const staffRes = await call("GET", listPath, ROLE_STAFF);
      assert.equal(staffRes.status, 403);
    });
  });
});
