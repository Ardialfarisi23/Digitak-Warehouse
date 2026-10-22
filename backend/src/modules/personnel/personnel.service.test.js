// Pengujian soft delete personil (BUG-12 Step 3b)
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

describe("personnel.repository - soft delete personil", () => {
  let prismaMock;
  let repository;

  beforeEach(() => {
    prismaMock = {
      personil: {
        findUnique: async () => null,
        update: async () => ({}),
        findMany: async () => [],
        count: async () => 0,
        findFirst: async () => null,
      },
      $transaction: async (fn) => fn(prismaMock),
    };

    mockModule("../../config/prisma", () => prismaMock);
    delete require.cache[require.resolve("./personnel.repository")];
    repository = require("./personnel.repository");
  });

  afterEach(() => {
    delete require.cache[require.resolve("./personnel.repository")];
  });

  it("softDelete sets is_aktif=false, deleted_at, deleted_by (not prisma.personil.delete)", async () => {
    let deleteCalled = false;
    prismaMock.personil.findUnique = async () => ({
      personil_id: 1,
      is_aktif: true,
    });
    prismaMock.personil.update = async (args) => {
      assert.strictEqual(args.data.is_aktif, false);
      assert.ok(args.data.deleted_at);
      assert.strictEqual(args.data.deleted_by, 100);
      return { personil_id: 1 };
    };
    prismaMock.personil.delete = async () => {
      deleteCalled = true;
    };

    const result = await repository.softDelete(1, 100);

    assert.strictEqual(deleteCalled, false, "prisma.personil.delete harus tidak dipanggil");
    assert.strictEqual(result.blocked, false);
  });

  it("softDelete mengembalikan null jika personil tidak ditemukan", async () => {
    prismaMock.personil.findUnique = async () => null;
    const result = await repository.softDelete(999, 100);
    assert.strictEqual(result, null);
  });
  it("softDelete berhasil bahkan jika sudah nonaktif (set ulang deleted_at/deleted_by)", async () => {
    prismaMock.personil.findUnique = async () => ({
      personil_id: 1,
      is_aktif: false,
    });
    prismaMock.personil.update = async () => ({ personil_id: 1, is_aktif: false });

    const result = await repository.softDelete(1, 100);

    assert.strictEqual(result.blocked, false);
  });

  it("restore mengembalikan is_aktif=true, deleted_at=null, deleted_by=null", async () => {
    prismaMock.personil.findUnique = async () => ({
      personil_id: 1,
      is_aktif: false,
    });
    prismaMock.personil.update = async (args) => {
      assert.strictEqual(args.data.is_aktif, true);
      assert.strictEqual(args.data.deleted_at, null);
      assert.strictEqual(args.data.deleted_by, null);
      return { personil_id: 1 };
    };

    const result = await repository.restore(1, 100);

    assert.strictEqual(result.blocked, false);
    assert.strictEqual(result.alreadyActive, undefined);
  });

  it("findAll default filter is_aktif=true", async () => {
    let whereArg = null;
    prismaMock.personil.count = async (args) => {
      whereArg = args.where;
      return 0;
    };
    prismaMock.personil.findMany = async (args) => {
      whereArg = args.where;
      return [];
    };

    await repository.findAll({});

    assert.strictEqual(whereArg.is_aktif, true);
  });
});

describe("personnel.service - soft delete dan restore personil", () => {
  let prismaMock;
  let service;
  let auditCalls = [];

  beforeEach(() => {
    auditCalls = [];
    prismaMock = {
      personil: {
        findUnique: async () => ({
          personil_id: 1,
          is_aktif: true,
          nama: "Test Personil",
        }),
        update: async () => ({ personil_id: 1, is_aktif: false }),
        findMany: async () => [],
        count: async () => 0,
        findFirst: async () => null,
        create: async () => ({}),
      },
      user_account: {
        findUnique: async () => ({ nama: "Admin" }),
        findMany: async () => [],
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
    mockModule("../../modules/notifications/notifications.service", () => ({
      create: async () => ({}),
    }));
    delete require.cache[require.resolve("./personnel.repository")];
    delete require.cache[require.resolve("./personnel.service")];
    service = require("./personnel.service");
  });

  afterEach(() => {
    delete require.cache[require.resolve("./personnel.service")];
  });

  it("softDelete menolak jika personil masih aktif", async () => {
    prismaMock.personil.findUnique = async () => ({
      personil_id: 1,
      is_aktif: true,
    });

    await assert.rejects(
      () => service.softDelete(1, 100),
      /Nonaktifkan personil terlebih dahulu/
    );
  });

  it("softDelete berhasil untuk personil nonaktif dan menuliskan audit_log", async () => {
    prismaMock.personil.findUnique = async () => ({
      personil_id: 1,
      is_aktif: false,
    });
    prismaMock.personil.update = async () => ({ personil_id: 1, is_aktif: false });
    await service.softDelete(1, 100);

    const softDeleteAudit = auditCalls.find((a) => a.aksi === "soft_delete");
    assert.ok(softDeleteAudit, "audit_log soft_delete harus dicatat");
    assert.strictEqual(softDeleteAudit.actor_id, 100n || 100);
    assert.strictEqual(softDeleteAudit.entity_type, "personil");
  });

  it("restore menuliskan audit_log aksi restore", async () => {
    prismaMock.personil.findUnique = async () => ({
      personil_id: 1,
      is_aktif: false,
    });
    await service.restore(1, 100);

    const restoreAudit = auditCalls.find((a) => a.aksi === "restore");
    assert.ok(restoreAudit, "audit_log restore harus dicatat");
    assert.strictEqual(restoreAudit.actor_id, 100n || 100);
  });
});
