const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

/**
 * Pengujian pembatasan akses modul Cluster & BOQ untuk Staf Gudang (K7).
 *
 * - Endpoint manajemen (daftar, detail, tambah, ubah) → 403 untuk STAFF.
 * - Endpoint read-only khusus staf → tetap boleh diakses (dropdown form SJ).
 * - Admin & Supervisor tetap memiliki akses penuh.
 */

function mockModule(modulePath, factory) {
  delete require.cache[require.resolve(modulePath)];
  require.cache[require.resolve(modulePath)] = {
    id: require.resolve(modulePath),
    filename: modulePath,
    loaded: true,
    exports: factory(),
  };
}

const auditLogMock = {
  create: async () => ({}),
};

const collectRoutes = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: layer.route.methods,
      handlers: layer.route.stack.map((h) => h.handle),
    }));

const findRoute = (routes, path, method) =>
  routes.find((r) => r.path === path && r.methods[method]);

const getAllowedRoles = (route) => {
  const handler = route.handlers.find((h) => Array.isArray(h.allowedRoles));
  return handler ? handler.allowedRoles : null;
};

describe("K7 — pembatasan akses Cluster & BOQ untuk Staf Gudang", () => {
  let clusterRoutes;
  let boqRoutes;
  let authorize;
  let clusterRouteList;
  let boqRouteList;

  beforeEach(() => {
    mockModule("../../config/prisma", () => ({ audit_log: auditLogMock }));
    delete require.cache[require.resolve("../../middlewares/role.middleware")];
    authorize = require("../../middlewares/role.middleware");

    delete require.cache[require.resolve("../cluster/cluster.routes")];
    delete require.cache[require.resolve("../boq/boq.routes")];
    clusterRoutes = require("../cluster/cluster.routes");
    boqRoutes = require("../boq/boq.routes");

    clusterRouteList = collectRoutes(clusterRoutes);
    boqRouteList = collectRoutes(boqRoutes);
  });

  afterEach(() => {
    delete require.cache[require.resolve("../cluster/cluster.routes")];
    delete require.cache[require.resolve("../boq/boq.routes")];
    delete require.cache[require.resolve("../../middlewares/role.middleware")];
  });

  describe("middleware authorize", () => {
    it("menolak STAFF dengan status 403", () => {
      const middleware = authorize("ADMIN", "SUPERVISOR");
      let nextError = null;
      middleware({ user: { id: 9, role: "staf_gudang" }, method: "GET", originalUrl: "/api/boqs" }, {}, (err) => {
        nextError = err;
      });
      assert.ok(nextError, "harus meneruskan error");
      assert.equal(nextError.statusCode, 403);
    });

    it("meloloskan ADMIN, SUPERVISOR, dan admin_general", () => {
      const middleware = authorize("ADMIN", "SUPERVISOR");
      for (const role of ["admin_general", "supervisor"]) {
        let called = false;
        let nextError = null;
        middleware({ user: { id: 1, role }, method: "GET", originalUrl: "/api/boqs" }, {}, (err) => {
          called = true;
          nextError = err || null;
        });
        assert.equal(called, true, `role ${role} harus boleh`);
        assert.equal(nextError, null);
      }
    });

    it("menolak permintaan tanpa user dengan 401", () => {
      const middleware = authorize("ADMIN", "SUPERVISOR");
      let nextError = null;
      middleware({ method: "GET", originalUrl: "/api/boqs" }, {}, (err) => {
        nextError = err;
      });
      assert.equal(nextError.statusCode, 401);
    });
  });

  describe("router Cluster", () => {
    it("membatasi endpoint daftar & detail ke ADMIN/SUPERVISOR", () => {
      const listByProject = findRoute(clusterRouteList, "/", "get");
      const listAll = findRoute(clusterRouteList, "/all", "get");
      assert.deepEqual(getAllowedRoles(listByProject), ["ADMIN", "SUPERVISOR"]);
      assert.deepEqual(getAllowedRoles(listAll), ["ADMIN", "SUPERVISOR"]);
    });

    it("membatasi endpoint tambah/ubah/hapus ke ADMIN/SUPERVISOR", () => {
      assert.deepEqual(getAllowedRoles(findRoute(clusterRouteList, "/", "post")), ["ADMIN", "SUPERVISOR"]);
      assert.deepEqual(getAllowedRoles(findRoute(clusterRouteList, "/:clusterId", "put")), ["ADMIN", "SUPERVISOR"]);
      assert.deepEqual(getAllowedRoles(findRoute(clusterRouteList, "/:clusterId", "delete")), ["ADMIN", "SUPERVISOR"]);
      assert.deepEqual(getAllowedRoles(findRoute(clusterRouteList, "/:clusterId/toggle-status", "patch")), ["ADMIN", "SUPERVISOR"]);
    });

    it("menyediakan endpoint read-only /options tanpa pembatasan role", () => {
      const options = findRoute(clusterRouteList, "/options", "get");
      assert.ok(options, "endpoint /options harus ada");
      assert.equal(getAllowedRoles(options), null);
    });
  });

  describe("router BOQ", () => {
    it("membatasi seluruh endpoint manajemen ke ADMIN/SUPERVISOR", () => {
      const managementRoutes = [
        ["/", "get"],
        ["/", "post"],
        ["/stats", "get"],
        ["/areas", "get"],
        ["/items", "get"],
        ["/check-ticket", "get"],
        ["/export", "get"],
        ["/export-matrix", "get"],
        ["/:id", "get"],
        ["/:id/summary", "get"],
        ["/:id", "put"],
        ["/:id/status", "put"],
        ["/:id/status", "patch"],
        ["/:id/verification", "put"],
        ["/:id/verification", "patch"],
      ];

      for (const [path, method] of managementRoutes) {
        const route = findRoute(boqRouteList, path, method);
        assert.ok(route, `route ${method.toUpperCase()} ${path} harus ada`);
        assert.deepEqual(
          getAllowedRoles(route),
          ["ADMIN", "SUPERVISOR"],
          `route ${method.toUpperCase()} ${path} harus dibatasi ADMIN/SUPERVISOR`
        );
      }
    });

    it("membatasi hapus & restore BOQ ke ADMIN (tidak boleh diakses staf)", () => {
      for (const [path, method] of [
        ["/:id", "delete"],
        ["/:id/restore", "put"],
        ["/:id/restore", "patch"],
      ]) {
        const route = findRoute(boqRouteList, path, method);
        assert.ok(route, `route ${method.toUpperCase()} ${path} harus ada`);
        assert.deepEqual(getAllowedRoles(route), ["ADMIN"]);
      }
    });

    it("menyediakan endpoint read-only /options tanpa pembatasan role", () => {
      for (const path of ["/options", "/options/items", "/options/:id"]) {
        const route = findRoute(boqRouteList, path, "get");
        assert.ok(route, `endpoint ${path} harus ada`);
        assert.equal(getAllowedRoles(route), null, `${path} harus bisa diakses staf`);
      }
    });

    it("mendaftarkan /options sebelum /:id agar tidak tertangkap route param", () => {
      const paths = boqRouteList.map((r) => r.path);
      assert.ok(paths.indexOf("/options") < paths.indexOf("/:id"));
      assert.ok(paths.indexOf("/options/items") < paths.indexOf("/:id"));
    });
  });
});
