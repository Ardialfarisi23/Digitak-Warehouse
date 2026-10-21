// Pengujian soft delete kendaraan (BUG-12 Step 3b)
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

describe("vehicle.repository - soft delete kendaraan", () => {
  let prismaMock;
  let repository;

  beforeEach(() => {
    prismaMock = {
      kendaraan: {
        findUnique: async () => null,
        update: async () => ({}),
        findMany: async () => [],
        count: async () => 0,
        findFirst: async () => null,
      },
      surat_jalan: {
        findFirst: async () => null,
      },
      $transaction: async (fn) => fn(prismaMock),
    };

    mockModule("../../config/prisma", () => prismaMock);
    delete require.cache[require.resolve("./vehicle.repository")];
    repository = require("./vehicle.repository");
  });

  afterEach(() => {
    delete require.cache[require.resolve("./vehicle.repository")];
  });

  it("softDelete sets is_aktif=false, deleted_at, deleted_by (not prisma.kendaraan.delete)", async () => {
    let deleteCalled = false;
    prismaMock.kendaraan.findUnique = async () => ({
      kendaraan_id: 1n,
      is_aktif: true,
      no_polisi: "B 1234 XYZ",
    });
    prismaMock.kendaraan.update = async (args) => {
      assert.strictEqual(args.data.is_aktif, false);
      assert.ok(args.data.deleted_at);
      assert.strictEqual(args.data.deleted_by, 100);
      return { kendaraan_id: 1n };
    };
    prismaMock.kendaraan.delete = async () => {
      deleteCalled = true;
    };
    prismaMock.surat_jalan.findFirst = async () => null;

    const result = await repository.softDelete(1, 100);

    assert.strictEqual(deleteCalled, false, "prisma.kendaraan.delete harus tidak dipanggil");
    assert.strictEqual(result.blocked, false);
  });

  it("softDelete menolak jika masih ada Surat Jalan aktif", async () => {
    prismaMock.kendaraan.findUnique = async () => ({
      kendaraan_id: 1n,
      is_aktif: true,
    });
    prismaMock.surat_jalan.findFirst = async () => ({ surat_jalan_id: 5n });

    const result = await repository.softDelete(1, 100);

    assert.strictEqual(result.blocked, true);
    assert.strictEqual(result.reason, "surat_jalan_aktif");
  });

  it("softDelete mengembalikan null jika kendaraan tidak ditemukan", async () => {
    prismaMock.kendaraan.findUnique = async () => null;
    const result = await repository.softDelete(999, 100);
    assert.strictEqual(result, null);
  });

  it("softDelete mengembalikan alreadyInactive jika sudah nonaktif", async () => {
    prismaMock.kendaraan.findUnique = async () => ({
      kendaraan_id: 1n,
      is_aktif: false,
    });
    const result = await repository.softDelete(1, 100);
    assert.strictEqual(result.alreadyInactive, true);
  });

  it("restore mengembalikan is_aktif=true, deleted_at=null, deleted_by=null", async () => {
    prismaMock.kendaraan.findUnique = async () => ({
      kendaraan_id: 1n,
      is_aktif: false,
    });
    prismaMock.kendaraan.update = async (args) => {
      assert.strictEqual(args.data.is_aktif, true);
      assert.strictEqual(args.data.deleted_at, null);
      assert.strictEqual(args.data.deleted_by, null);
      return { kendaraan_id: 1n };
    };

    const result = await repository.restore(1, 100);

    assert.strictEqual(result.blocked, false);
    assert.strictEqual(result.alreadyActive, undefined);
  });

  it("restore mengembalikan alreadyActive jika sudah aktif", async () => {
    prismaMock.kendaraan.findUnique = async () => ({
      kendaraan_id: 1n,
      is_aktif: true,
    });
    const result = await repository.restore(1, 100);
    assert.strictEqual(result.alreadyActive, true);
  });

  it("findAll default filter is_aktif=true", async () => {
    let whereArg = null;
    prismaMock.kendaraan.count = async (args) => {
      whereArg = args.where;
      return 0;
    };
    prismaMock.kendaraan.findMany = async (args) => {
      whereArg = args.where;
      return [];
    };

    await repository.findAll({});

    assert.strictEqual(whereArg.is_aktif, true);
  });

  it("findAll dengan is_aktif=false tetap hanya mengembalikan kendaraan aktif", async () => {
    let whereArg = null;
    prismaMock.kendaraan.count = async (args) => {
      whereArg = args.where;
      return 0;
    };
    prismaMock.kendaraan.findMany = async (args) => {
      whereArg = args.where;
      return [];
    };

    await repository.findAll({ is_aktif: "false" });

    assert.strictEqual(whereArg.is_aktif, true);
  });

  it("findAll mengabaikan include_inactive", async () => {
    let whereArg = null;
    prismaMock.kendaraan.count = async (args) => {
      whereArg = args.where;
      return 0;
    };
    prismaMock.kendaraan.findMany = async (args) => {
      whereArg = args.where;
      return [];
    };

    await repository.findAll({ include_inactive: "true" });

    assert.strictEqual(whereArg.is_aktif, true);
  });

  it("findByNoPolisi tanpa includeInactive hanya mengambil kendaraan aktif", async () => {
    let whereArg = null;
    prismaMock.kendaraan.findFirst = async (args) => {
      whereArg = args.where;
      return null;
    };

    await repository.findByNoPolisi("B 1234 XYZ");

    assert.strictEqual(whereArg.is_aktif, true);
  });

  it("findByNoPolisi dengan includeInactive tidak filter is_aktif", async () => {
    let whereArg = null;
    prismaMock.kendaraan.findFirst = async (args) => {
      whereArg = args.where;
      return null;
    };

    await repository.findByNoPolisi("B 1234 XYZ", { includeInactive: true });

    assert.strictEqual(whereArg.is_aktif, undefined);
  });
});

describe("vehicle.service - soft delete dan restore kendaraan", () => {
  let prismaMock;
  let service;
  let auditCalls = [];

  beforeEach(() => {
    auditCalls = [];
    prismaMock = {
      kendaraan: {
        findUnique: async () => ({
          kendaraan_id: 1n,
          is_aktif: true,
          no_polisi: "B 1234 XYZ",
          merk: "Toyota",
          jenis_kendaraan: "Truck",
        }),
        update: async () => ({ kendaraan_id: 1n, is_aktif: false }),
        findMany: async () => [],
        count: async () => 0,
        findFirst: async () => null,
        create: async () => ({}),
      },
      surat_jalan: {
        findFirst: async () => null,
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
    delete require.cache[require.resolve("./vehicle.repository")];
    delete require.cache[require.resolve("./vehicle.service")];
    service = require("./vehicle.service");
  });

  afterEach(() => {
    delete require.cache[require.resolve("./vehicle.service")];
  });

  it("softDelete menuliskan audit_log aksi soft_delete", async () => {
    await service.softDelete(1, 100);

    const softDeleteAudit = auditCalls.find((a) => a.aksi === "soft_delete");
    assert.ok(softDeleteAudit, "audit_log soft_delete harus dicatat");
    assert.strictEqual(softDeleteAudit.actor_id, 100n || 100);
    assert.strictEqual(softDeleteAudit.entity_type, "kendaraan");
  });

  it("restore menuliskan audit_log aksi restore", async () => {
    prismaMock.kendaraan.findUnique = async () => ({
      kendaraan_id: 1n,
      is_aktif: false,
    });
    await service.restore(1, 100);

    const restoreAudit = auditCalls.find((a) => a.aksi === "restore");
    assert.ok(restoreAudit, "audit_log restore harus dicatat");
    assert.strictEqual(restoreAudit.actor_id, 100n || 100);
  });

  it("create menolak jika no_polisi sudah dipakai kendaraan yang telah dihapus", async () => {
    prismaMock.kendaraan.findFirst = async () => ({
      kendaraan_id: 2n,
      is_aktif: false,
      no_polisi: "B 1234 XYZ",
    });

    await assert.rejects(
      () =>
        service.create(
          { no_polisi: "B 1234 XYZ", jenis_kendaraan: "Truck", merk: "X" },
          100
        ),
      /No polisi sudah dipakai oleh kendaraan yang telah dihapus/
    );
  });

  it("findByNoPolisi mengembalikan 404 untuk kendaraan yang telah dihapus", async () => {
    prismaMock.kendaraan.findFirst = async () => null;

    await assert.rejects(
      () => service.findByNoPolisi("B 1234 XYZ"),
      (err) =>
        err.statusCode === 404 && /Data tidak ditemukan/.test(err.message)
    );
  });

  it("findByNoPolisi mengembalikan data untuk kendaraan aktif", async () => {
    prismaMock.kendaraan.findFirst = async () => ({
      kendaraan_id: 1n,
      no_polisi: "B 1234 XYZ",
      is_aktif: true,
    });

    const result = await service.findByNoPolisi("B 1234 XYZ");

    assert.strictEqual(result.no_polisi, "B 1234 XYZ");
    assert.strictEqual(result.is_aktif, true);
  });
});
