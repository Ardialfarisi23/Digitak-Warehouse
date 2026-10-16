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
    audit_log: {
      create: async () => ({ audit_id: 1 }),
    },
  };
}

describe("utils/audit-log", () => {
  let createAuditLog;
  let prismaMock;

  function setup() {
    prismaMock = buatPrismaMock();
    mockModule("../config/prisma", () => prismaMock);
    delete require.cache[require.resolve("./audit-log")];
    ({ createAuditLog } = require("./audit-log"));
  }

  beforeEach(setup);

  afterEach(() => {
    delete require.cache[require.resolve("./audit-log")];
  });

  describe("createAuditLog - actorId null handling", () => {
    it("allows null actor_id for login_failed", async () => {
      let capturedPayload = null;
      prismaMock.audit_log.create = async (args) => {
        capturedPayload = args.data;
        return { audit_id: 1 };
      };

      await createAuditLog({
        entityType: "user_account",
        entityId: 0,
        aksi: "login_failed",
        actorId: null,
      });

      assert.equal(capturedPayload.actor_id, null);
      assert.equal(capturedPayload.aksi, "login_failed");
    });

    it("rejects null actor_id for actions other than login_failed", async () => {
      prismaMock.audit_log.create = async () => ({ audit_id: 1 });

      await assert.rejects(
        async () =>
          createAuditLog({
            entityType: "user_account",
            entityId: 1,
            aksi: "create",
            actorId: null,
          }),
        /actor_id is required for action: create/
      );
    });

    it("rejects undefined actor_id for actions other than login_failed", async () => {
      prismaMock.audit_log.create = async () => ({ audit_id: 1 });

      await assert.rejects(
        async () =>
          createAuditLog({
            entityType: "user_account",
            entityId: 1,
            aksi: "update",
            actorId: undefined,
          }),
        /actor_id is required for action: update/
      );
    });

    it("accepts valid actor_id for login_success", async () => {
      let capturedPayload = null;
      prismaMock.audit_log.create = async (args) => {
        capturedPayload = args.data;
        return { audit_id: 1 };
      };

      await createAuditLog({
        entityType: "user_account",
        entityId: 1,
        aksi: "login_success",
        actorId: 123,
      });

      assert.equal(capturedPayload.actor_id, BigInt(123));
    });

    it("logs error and re-throws on DB failure", async () => {
      const originalError = console.error;
      const errors = [];
      console.error = (...args) => errors.push(args.join(" "));

      prismaMock.audit_log.create = async () => {
        throw new Error("DB connection failed");
      };

      await assert.rejects(
        async () =>
          createAuditLog({
            entityType: "user_account",
            entityId: 1,
            aksi: "login_failed",
            actorId: null,
          }),
        /DB connection failed/
      );

      assert.ok(errors.some((e) => e.includes("[audit-log]") && e.includes("login_failed")));

      console.error = originalError;
    });
  });

  describe("toBigInt", () => {
    const { toBigInt } = require("./audit-log");

    it("returns BigInt(0) for null", () => {
      assert.equal(toBigInt(null), BigInt(0));
    });

    it("returns BigInt(0) for undefined", () => {
      assert.equal(toBigInt(undefined), BigInt(0));
    });

    it("parses numeric string to BigInt", () => {
      assert.equal(toBigInt("42"), BigInt(42));
    });

    it("hashes non-numeric string to BigInt", () => {
      const result = toBigInt("cluster-1");
      assert.ok(typeof result === "bigint");
      assert.ok(result > 0n);
    });

    it("passes through bigint", () => {
      assert.equal(toBigInt(BigInt(99)), BigInt(99));
    });

    it("converts number to BigInt", () => {
      assert.equal(toBigInt(7), BigInt(7));
    });
  });
});