const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

function mockModule(modulePath, factory) {
  delete require.cache[require.resolve(modulePath)];
  require.cache[require.resolve(modulePath)] = {
    id: require.resolve(modulePath),
    filename: modulePath,
    loaded: true,
    exports: factory(),
  };
}

function buatPrismaMock() {
  return {
    personil: {
      findUnique: async () => null,
    },
    user_gudang: {
      findMany: async () => [],
    },
    gudang: {
      findMany: async () => [],
    },
    zona_gudang: {
      findUnique: async () => null,
    },
  };
}

describe("resolveGudangIds", () => {
  let resolveGudangIds;
  let prismaMock;

  function setup() {
    prismaMock = buatPrismaMock();
    mockModule("../config/prisma", () => prismaMock);
    delete require.cache[require.resolve("./gudang-scope.middleware")];
    ({ resolveGudangIds } = require("./gudang-scope.middleware"));
  }

  beforeEach(setup);

  afterEach(() => {
    delete require.cache[require.resolve("./gudang-scope.middleware")];
  });

  it("userId bukan angka positif -> daftar kosong tanpa query", async () => {
    let dipanggil = false;
    prismaMock.personil.findUnique = async () => {
      dipanggil = true;
      return null;
    };

    assert.deepEqual(await resolveGudangIds(null), []);
    assert.deepEqual(await resolveGudangIds(""), []);
    assert.deepEqual(await resolveGudangIds("abc"), []);
    assert.equal(dipanggil, false);
  });

  it("menggabungkan user_gudang + personil.gudang_id + gudang.pic_id lalu mengurutkan & dedup", async () => {
    prismaMock.personil.findUnique = async () => ({ personil_id: 5, gudang_id: 2n });
    prismaMock.user_gudang.findMany = async () => [{ gudang_id: 3n }, { gudang_id: 1n }];
    prismaMock.gudang.findMany = async () => [{ gudang_id: 1n }, { gudang_id: 4n }];

    assert.deepEqual(await resolveGudangIds(8), [1, 2, 3, 4]);
  });

  it("PIC sebuah gudang otomatis dapat penugasan walau personil.gudang_id kosong", async () => {
    prismaMock.personil.findUnique = async () => ({ personil_id: 5, gudang_id: null });
    prismaMock.gudang.findMany = async () => [{ gudang_id: 1n }];

    assert.deepEqual(await resolveGudangIds(8), [1]);
  });

  it("tidak punya personil -> hanya user_gudang yang dipakai, gudang tidak dikueri", async () => {
    prismaMock.user_gudang.findMany = async () => [{ gudang_id: 7n }];

    let gudangDipanggil = false;
    prismaMock.gudang.findMany = async () => {
      gudangDipanggil = true;
      return [];
    };

    assert.deepEqual(await resolveGudangIds(9), [7]);
    assert.equal(gudangDipanggil, false);
  });

  it("nilai gudang_id tidak valid diabaikan", async () => {
    prismaMock.personil.findUnique = async () => ({ personil_id: 5, gudang_id: 0n });
    prismaMock.user_gudang.findMany = async () => [{ gudang_id: null }, { gudang_id: 6n }];
    prismaMock.gudang.findMany = async () => [{ gudang_id: -3n }];

    assert.deepEqual(await resolveGudangIds(8), [6]);
  });
});

describe("attachGudangScope", () => {
  let attachGudangScope;
  let prismaMock;

  function setup() {
    prismaMock = buatPrismaMock();
    mockModule("../config/prisma", () => prismaMock);
    delete require.cache[require.resolve("./gudang-scope.middleware")];
    ({ attachGudangScope } = require("./gudang-scope.middleware"));
  }

  async function jalankan(user) {
    const req = { user };
    const hasil = { dipanggil: 0, error: null };
    await attachGudangScope(req, {}, (err) => {
      hasil.dipanggil += 1;
      hasil.error = err || null;
    });
    return { req, hasil };
  }

  beforeEach(setup);

  afterEach(() => {
    delete require.cache[require.resolve("./gudang-scope.middleware")];
  });

  it("tanpa req.user -> 401 diteruskan ke error handler", async () => {
    const { hasil } = await jalankan(undefined);
    assert.equal(hasil.error?.statusCode, 401);
  });

  it("admin_general -> tidak dibatasi tanpa menyentuh query gudang", async () => {
    let dipanggil = false;
    prismaMock.personil.findUnique = async () => {
      dipanggil = true;
      return null;
    };

    const { req, hasil } = await jalankan({ id: 1, role: "admin_general" });

    assert.equal(hasil.error, null);
    assert.equal(hasil.dipanggil, 1);
    assert.deepEqual(req.gudangScope, {
      dibatasi: false,
      sudahDitugaskan: true,
      gudangIds: [],
      gudangUtamaId: null,
    });
    assert.equal(dipanggil, false);
  });

  it("supervisor -> tidak dibatasi", async () => {
    const { req, hasil } = await jalankan({ id: 2, role: "supervisor" });
    assert.equal(hasil.error, null);
    assert.equal(req.gudangScope.dibatasi, false);
  });

  it("staf_gudang dengan penugasan -> dibatasi ke daftar gudang", async () => {
    prismaMock.personil.findUnique = async () => ({ personil_id: 5, gudang_id: 1n });
    prismaMock.user_gudang.findMany = async () => [];
    prismaMock.gudang.findMany = async () => [];

    const { req, hasil } = await jalankan({ id: 8, role: "staf_gudang" });

    assert.equal(hasil.error, null);
    assert.deepEqual(req.gudangScope, {
      dibatasi: true,
      sudahDitugaskan: true,
      gudangIds: [1],
      gudangUtamaId: 1,
    });
  });

  it("staf_gudang tanpa penugasan -> tidak dibatasi dan TIDAK diblokir 403", async () => {
    prismaMock.personil.findUnique = async () => ({ personil_id: 5, gudang_id: null });
    prismaMock.user_gudang.findMany = async () => [];
    prismaMock.gudang.findMany = async () => [];

    const { req, hasil } = await jalankan({ id: 8, role: "staf_gudang" });

    assert.equal(hasil.error, null, "staf tanpa penugasan tidak boleh diblokir");
    assert.equal(hasil.dipanggil, 1);
    assert.deepEqual(req.gudangScope, {
      dibatasi: false,
      sudahDitugaskan: false,
      gudangIds: [],
      gudangUtamaId: null,
    });
  });

  it("role tak dikenal -> 403", async () => {
    const { hasil } = await jalankan({ id: 99, role: "unknown_role" });
    assert.equal(hasil.error?.statusCode, 403);
    assert.equal(hasil.error?.message, "Anda tidak memiliki akses ke gudang ini.");
  });
});

describe("assertGudangDiizinkan / assertAdaGudangDiizinkan", () => {
  let middleware;

  beforeEach(() => {
    middleware = require("./gudang-scope.middleware");
  });

  it("staf PIC boleh akses gudang yang di-PIC-nya, ditolak gudang lain", () => {
    const scope = { dibatasi: true, sudahDitugaskan: true, gudangIds: [1], gudangUtamaId: 1 };
    assert.equal(middleware.assertGudangDiizinkan(scope, 1), true);
    assert.equal(middleware.assertGudangDiizinkan(scope, "1"), true, "ID string harus diterima");
    assert.throws(() => middleware.assertGudangDiizinkan(scope, 2), { statusCode: 403 });
  });

  it("staf tanpa penugasan (dibatasi: false) lolos ke guard manapun", () => {
    const scope = { dibatasi: false, sudahDitugaskan: false, gudangIds: [], gudangUtamaId: null };
    assert.equal(middleware.assertGudangDiizinkan(scope, 99), true);
    assert.equal(middleware.assertAdaGudangDiizinkan(scope, [1, 99]), true);
  });

  it("scope malformed -> 403, bukan lolos bebas", () => {
    for (const buruk of [undefined, null, {}, "scope", { dibatasi: "ya" }]) {
      assert.throws(() => middleware.assertGudangDiizinkan(buruk, 1), { statusCode: 403 });
      assert.throws(() => middleware.assertAdaGudangDiizinkan(buruk, [1]), { statusCode: 403 });
    }
  });

  it("surat jalan dua sisi gudang: cukup satu sisi diizinkan", () => {
    const scope = { dibatasi: true, sudahDitugaskan: true, gudangIds: [1], gudangUtamaId: 1 };
    assert.equal(middleware.assertAdaGudangDiizinkan(scope, [2, 1]), true);
    assert.throws(() => middleware.assertAdaGudangDiizinkan(scope, [2, 3]), { statusCode: 403 });
  });

  it("gudangId tidak valid ditolak, bukan dianggap benar", () => {
    const scope = { dibatasi: true, sudahDitugaskan: true, gudangIds: [1], gudangUtamaId: 1 };
    for (const buruk of [null, undefined, "", 0, -1, "abc"]) {
      assert.throws(() => middleware.assertGudangDiizinkan(scope, buruk), { statusCode: 403 });
    }
  });
});

describe("assertZonaMilikGudang", () => {
  let middleware;
  let prismaMock;

  beforeEach(() => {
    prismaMock = buatPrismaMock();
    mockModule("../config/prisma", () => prismaMock);
    delete require.cache[require.resolve("./gudang-scope.middleware")];
    middleware = require("./gudang-scope.middleware");
  });

  afterEach(() => {
    delete require.cache[require.resolve("./gudang-scope.middleware")];
  });

  it("zona milik gudang yang diharapkan -> boleh", async () => {
    prismaMock.zona_gudang.findUnique = async () => ({ gudang_id: 1n });
    assert.equal(await middleware.assertZonaMilikGudang(10, 1), true);
  });

  it("zona milik gudang lain -> 403", async () => {
    prismaMock.zona_gudang.findUnique = async () => ({ gudang_id: 2n });
    await assert.rejects(() => middleware.assertZonaMilikGudang(10, 1), { statusCode: 403 });
  });

  it("zona tanpa pemilik gudang -> 403", async () => {
    prismaMock.zona_gudang.findUnique = async () => ({ gudang_id: null });
    await assert.rejects(() => middleware.assertZonaMilikGudang(10, 1), { statusCode: 403 });
  });

  it("zona tidak ada -> 404", async () => {
    prismaMock.zona_gudang.findUnique = async () => null;
    await assert.rejects(() => middleware.assertZonaMilikGudang(10, 1), { statusCode: 404 });
  });

  it("zonaId tidak valid -> 403 tanpa query", async () => {
    let dipanggil = false;
    prismaMock.zona_gudang.findUnique = async () => {
      dipanggil = true;
      return null;
    };

    await assert.rejects(() => middleware.assertZonaMilikGudang("abc", 1), { statusCode: 403 });
    assert.equal(dipanggil, false);
  });
});