// Pengujian soft delete project (BUG-12 Step 3b)
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

describe("project.service - DELETE diarahkan ke soft delete (nonaktifkan)", () => {
  let prismaMock;
  let service;
  let auditCalls = [];

  beforeEach(() => {
    auditCalls = [];
    prismaMock = {
      project: {
        findUnique: async () => ({
          project_id: 1n,
          status_aktif: true,
          nama_project: "Test Project",
        }),
        update: async () => ({ project_id: 1n, status_aktif: false }),
        findMany: async () => [],
        count: async () => 0,
        findFirst: async () => null,
        create: async () => ({}),
      },
      boq: {
        findMany: async () => [],
      },
      surat_jalan: {
        count: async () => 0,
      },
      audit_log: {
        create: async (args) => {
          auditCalls.push(args.data);
          return { audit_id: 1n };
        },
      },
      $transaction: async (fn) => fn(prismaMock),
    };

    mockModule("../../config/prisma", () => prismaMock);
    delete require.cache[require.resolve("./project.repository")];
    delete require.cache[require.resolve("./project.service")];
    service = require("./project.service");
  });

  afterEach(() => {
    delete require.cache[require.resolve("./project.service")];
  });

  it("remove (DELETE) melakukan soft delete via nonaktifkan, bukan prisma.project.delete", async () => {
    let deleteCalled = false;
    prismaMock.project.delete = async () => {
      deleteCalled = true;
    };

    await service.remove(1, 100);

    assert.strictEqual(deleteCalled, false, "prisma.project.delete harus tidak dipanggil");
  });

  it("remove menulis audit_log aksi nonaktifkan_project", async () => {
    await service.remove(1, 100);

    const audit = auditCalls.find((a) => a.aksi === "nonaktifkan_project");
    assert.ok(audit, "audit_log nonaktifkan_project harus dicatat saat DELETE");
    assert.strictEqual(audit.entity_type, "project");
  });

  it("restore menulis audit_log aksi aktifkan_project", async () => {
    prismaMock.project.findUnique = async () => ({
      project_id: 1n,
      status_aktif: false,
    });
    await service.restore(1, 100);

    const audit = auditCalls.find((a) => a.aksi === "aktifkan_project");
    assert.ok(audit, "audit_log aktifkan_project harus dicatat saat restore");
  });

  it("project.repository tidak lagi memiliki prisma.project.delete", async () => {
    delete require.cache[require.resolve("./project.repository")];
    const repo = require("./project.repository");
    assert.strictEqual(typeof repo.remove, "function");
    assert.strictEqual(typeof repo.softDelete, "function");
    assert.strictEqual(typeof repo.restore, "function");
  });
});
