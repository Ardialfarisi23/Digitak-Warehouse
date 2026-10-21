// Pengujian soft delete barang (BUG-12 Step 3a)
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

describe("item.repository - soft delete barang", () => {
  let prismaMock;
  let repository;

  beforeEach(() => {
    prismaMock = {
      barang: {
        findUnique: async () => null,
        update: async () => ({}),
        findMany: async () => [],
        count: async () => 0,
        findFirst: async () => null,
      },
      stok_gudang: {
        findFirst: async () => null,
      },
      $transaction: async (fn) => fn(prismaMock),
    };

    mockModule("../../config/prisma", () => prismaMock);
    delete require.cache[require.resolve("./item.repository")];
    repository = require("./item.repository");
  });

  afterEach(() => {
    delete require.cache[require.resolve("./item.repository")];
  });

  it("softDelete sets is_aktif=false, deleted_at, deleted_by (not prisma.barang.delete)", async () => {
    let deleteCalled = false;
    prismaMock.barang.findUnique = async () => ({
      barang_id: 1n,
      is_aktif: true,
    });
    prismaMock.barang.update = async (args) => {
      assert.strictEqual(args.data.is_aktif, false);
      assert.ok(args.data.deleted_at);
      assert.strictEqual(args.data.deleted_by, 100);
      return { barang_id: 1n };
    };
    prismaMock.barang.delete = async () => {
      deleteCalled = true;
    };
    prismaMock.stok_gudang.findFirst = async () => null;

    const result = await repository.softDelete(1, 100);

    assert.strictEqual(deleteCalled, false, "prisma.barang.delete harus tidak dipanggil");
    assert.strictEqual(result.blocked, false);
  });

  it("softDelete menolak jika stok_gudang qty > 0", async () => {
    prismaMock.barang.findUnique = async () => ({
      barang_id: 1n,
      is_aktif: true,
    });
    prismaMock.stok_gudang.findFirst = async () => ({ stok_id: 5n });

    const result = await repository.softDelete(1, 100);

    assert.strictEqual(result.blocked, true);
    assert.strictEqual(result.reason, "stok_aktif");
  });

  it("softDelete mengembalikan null jika barang tidak ditemukan", async () => {
    prismaMock.barang.findUnique = async () => null;
    const result = await repository.softDelete(999, 100);
    assert.strictEqual(result, null);
  });

  it("softDelete mengembalikan alreadyInactive jika sudah nonaktif", async () => {
    prismaMock.barang.findUnique = async () => ({
      barang_id: 1n,
      is_aktif: false,
    });
    const result = await repository.softDelete(1, 100);
    assert.strictEqual(result.alreadyInactive, true);
  });

  it("restore mengembalikan is_aktif=true, deleted_at=null, deleted_by=null", async () => {
    prismaMock.barang.findUnique = async () => ({
      barang_id: 1n,
      is_aktif: false,
    });
    prismaMock.barang.update = async (args) => {
      assert.strictEqual(args.data.is_aktif, true);
      assert.strictEqual(args.data.deleted_at, null);
      assert.strictEqual(args.data.deleted_by, null);
      return { barang_id: 1n };
    };

    const result = await repository.restore(1, 100);

    assert.strictEqual(result.blocked, false);
    assert.strictEqual(result.alreadyActive, undefined);
  });

  it("restore mengembalikan alreadyActive jika sudah aktif", async () => {
    prismaMock.barang.findUnique = async () => ({
      barang_id: 1n,
      is_aktif: true,
    });
    const result = await repository.restore(1, 100);
    assert.strictEqual(result.alreadyActive, true);
  });

  it("findAll default filter is_aktif=true", async () => {
    let whereArg = null;
    prismaMock.barang.count = async (args) => {
      whereArg = args.where;
      return 0;
    };
    prismaMock.barang.findMany = async (args) => {
      whereArg = args.where;
      return [];
    };

    await repository.findAll({});

    assert.strictEqual(whereArg.is_aktif, true);
  });

  it("findAll dengan is_aktif=false tetap hanya mengembalikan barang aktif", async () => {
    let whereArg = null;
    prismaMock.barang.count = async (args) => {
      whereArg = args.where;
      return 0;
    };
    prismaMock.barang.findMany = async (args) => {
      whereArg = args.where;
      return [];
    };

    await repository.findAll({ is_aktif: "false" });

    assert.strictEqual(whereArg.is_aktif, true);
  });

  it("findAll mengabaikan include_inactive", async () => {
    let whereArg = null;
    prismaMock.barang.count = async (args) => {
      whereArg = args.where;
      return 0;
    };
    prismaMock.barang.findMany = async (args) => {
      whereArg = args.where;
      return [];
    };

    await repository.findAll({ include_inactive: "true" });

    assert.strictEqual(whereArg.is_aktif, true);
  });

  it("findByKode default filter is_aktif=true", async () => {
    let whereArg = null;
    prismaMock.barang.findFirst = async (args) => {
      whereArg = args.where;
      return null;
    };

    await repository.findByKode("ITEM-001");

    assert.strictEqual(whereArg.is_aktif, true);
  });

  it("findByKode includeInactive tidak filter is_aktif", async () => {
    let whereArg = null;
    prismaMock.barang.findUnique = async (args) => {
      whereArg = args.where;
      return null;
    };

    await repository.findByKode("ITEM-001", { includeInactive: true });

    assert.strictEqual(whereArg.is_aktif, undefined);
  });

  it("findByKode tanpa includeInactive hanya mengambil barang aktif", async () => {
    let whereArg = null;
    prismaMock.barang.findFirst = async (args) => {
      whereArg = args.where;
      return null;
    };

    await repository.findByKode("ITEM-001");

    assert.strictEqual(whereArg.is_aktif, true);
  });
});

describe("item.service - soft delete dan restore", () => {
  let prismaMock;
  let service;
  let auditLogCalls = [];

  beforeEach(() => {
    auditLogCalls = [];
    prismaMock = {
      barang: {
        findUnique: async () => ({
          barang_id: 1n,
          is_aktif: true,
          kode_perangkat: "ITEM-001",
          nama_barang: "Test Item",
        }),
        update: async () => ({ barang_id: 1n, is_aktif: false }),
        findMany: async () => [],
        count: async () => 0,
        findFirst: async () => null,
        create: async () => ({}),
      },
      stok_gudang: {
        findFirst: async () => null,
      },
      user_account: {
        findUnique: async () => ({ nama: "Admin" }),
        findMany: async () => [],
      },
      audit_log: {
        create: async (args) => {
          auditLogCalls.push(args.data);
          return { audit_id: 1n };
        },
      },
      $transaction: async (fn) => fn(prismaMock),
    };

    mockModule("../../config/prisma", () => prismaMock);
    mockModule("../../modules/notifications/notifications.service", () => ({
      create: async () => ({}),
    }));
    delete require.cache[require.resolve("./item.repository")];
    delete require.cache[require.resolve("./item.service")];
    service = require("./item.service");
  });

  afterEach(() => {
    delete require.cache[require.resolve("./item.service")];
  });

  it("softDelete menuliskan audit_log aksi soft_delete", async () => {
    await service.softDelete(1, 100);

    const softDeleteAudit = auditLogCalls.find((a) => a.aksi === "soft_delete");
    assert.ok(softDeleteAudit, "audit_log soft_delete harus dicatat");
    assert.strictEqual(softDeleteAudit.actor_id, 100n || 100);
    assert.strictEqual(softDeleteAudit.entity_type, "item");
  });

  it("restore menuliskan audit_log aksi restore", async () => {
    prismaMock.barang.findUnique = async () => ({
      barang_id: 1n,
      is_aktif: false,
    });
    await service.restore(1, 100);

    const restoreAudit = auditLogCalls.find((a) => a.aksi === "restore");
    assert.ok(restoreAudit, "audit_log restore harus dicatat");
    assert.strictEqual(restoreAudit.actor_id, 100n || 100);
  });

  it("create menolak jika kode sudah dipakai barang yang telah dihapus", async () => {
    prismaMock.barang.findUnique = async () => ({
      barang_id: 2n,
      is_aktif: false,
      kode_perangkat: "ITEM-001",
    });

    await assert.rejects(
      () => service.create({ kode_perangkat: "ITEM-001", nama_barang: "X" }, 100),
      /Kode sudah dipakai oleh barang yang telah dihapus/
    );
  });

  it("findByKode mengembalikan 404 untuk barang yang telah dihapus", async () => {
    prismaMock.barang.findFirst = async () => null;

    await assert.rejects(
      () => service.findByKode("ITEM-001"),
      (err) =>
        err.statusCode === 404 && /Data tidak ditemukan/.test(err.message)
    );
  });

  it("findByKode mengembalikan data untuk barang aktif", async () => {
    prismaMock.barang.findFirst = async () => ({
      barang_id: 1n,
      kode_perangkat: "ITEM-001",
      nama_barang: "Test Item",
      is_aktif: true,
    });

    const result = await service.findByKode("ITEM-001");

    assert.strictEqual(result.kode_perangkat, "ITEM-001");
    assert.strictEqual(result.is_aktif, true);
  });
});
