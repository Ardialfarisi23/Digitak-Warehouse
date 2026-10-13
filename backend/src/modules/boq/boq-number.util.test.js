const assert = require("assert");
const { getJakartaYear, formatBoqNumber, parseBoqSequence, withBoqNumberRetry, isBoqNumberUniqueViolation } = require("./boq-number.util");
const AppError = require("../../shared/errors");

let passed = 0;
const test = (name, fn) => {
  try { fn(); console.log(`  ok - ${name}`); passed++; }
  catch (e) { console.error(`  FAIL - ${name}: ${e.message}`); process.exitCode = 1; }
};

console.log("boq-number.util tests");

test("formatBoqNumber zero-pads month and day", () => {
  const d = new Date(2026, 0, 1, 0, 0, 0);
  assert.strictEqual(formatBoqNumber(d, 6), "BOQ-2026/01/01-0006");
});

test("formatBoqNumber pads sequence to 4 digits", () => {
  const d = new Date(2026, 9, 13, 0, 0, 0);
  assert.strictEqual(formatBoqNumber(d, 13), "BOQ-2026/10/13-0013");
});

test("parseBoqSequence reads new format", () => {
  assert.strictEqual(parseBoqSequence("BOQ-2026/10/13-0006"), 6);
});

test("parseBoqSequence reads old format", () => {
  assert.strictEqual(parseBoqSequence("BOQ-2026-0013"), 13);
});

test("parseBoqSequence returns null for invalid", () => {
  assert.strictEqual(parseBoqSequence(null), null);
  assert.strictEqual(parseBoqSequence(""), null);
  assert.strictEqual(parseBoqSequence("BOQ-abc"), null);
});

test("getJakartaYear respects timezone", () => {
  const year = getJakartaYear();
  assert.ok(Number.isInteger(year) && year >= 2024 && year <= 2030);
});

test("isBoqNumberUniqueViolation: target array with boq_number", () => {
  assert.strictEqual(isBoqNumberUniqueViolation({ code: "P2002", meta: { target: ["boq_number"] } }), true);
});

test("isBoqNumberUniqueViolation: target string boq_number", () => {
  assert.strictEqual(isBoqNumberUniqueViolation({ code: "P2002", meta: { target: "boq_number" } }), true);
});

test("isBoqNumberUniqueViolation: target tiket_id is false", () => {
  assert.strictEqual(isBoqNumberUniqueViolation({ code: "P2002", meta: { target: ["tiket_id"] } }), false);
});

test("isBoqNumberUniqueViolation: non-P2002 is false", () => {
  assert.strictEqual(isBoqNumberUniqueViolation({ code: "P2003" }), false);
  assert.strictEqual(isBoqNumberUniqueViolation(null), false);
});

(async () => {
  await (async () => {
    let calls = 0;
    const numbers = ["BOQ-2026/10/13-0001", "BOQ-2026/10/13-0002"];
    const generateFn = async () => numbers[calls];
    const createFn = async (num) => {
      calls++;
      if (calls === 1) {
        const err = new Error("unique violation");
        err.code = "P2002";
        err.meta = { target: ["boq_number"] };
        throw err;
      }
      return { boq_number: num, id: "ok" };
    };
    const result = await withBoqNumberRetry(generateFn, createFn, 3);
    assert.strictEqual(result.boq_number, "BOQ-2026/10/13-0002");
    assert.strictEqual(calls, 2);
    console.log("  ok - withBoqNumberRetry retries on P2002 then succeeds");
    passed++;
  })().catch(e => { console.error("  FAIL - withBoqNumberRetry retries on P2002 then succeeds:", e.message); process.exitCode = 1; });

  await (async () => {
    let calls = 0;
    const generateFn = async () => "BOQ-2026/10/13-0001";
    const createFn = async () => {
      calls++;
      const err = new Error("other error");
      err.code = "P2003";
      throw err;
    };
    await assert.rejects(() => withBoqNumberRetry(generateFn, createFn, 3), /other error/);
    assert.strictEqual(calls, 1);
    console.log("  ok - withBoqNumberRetry throws non-P2002 without retry");
    passed++;
  })().catch(e => { console.error("  FAIL - withBoqNumberRetry throws non-P2002 without retry:", e.message); process.exitCode = 1; });

  await (async () => {
    let calls = 0;
    const generateFn = async () => "BOQ-2026/10/13-0001";
    const createFn = async () => {
      calls++;
      const err = new Error("still unique");
      err.code = "P2002";
      err.meta = { target: ["boq_number"] };
      throw err;
    };
    let caught;
    try {
      await withBoqNumberRetry(generateFn, createFn, 3);
    } catch (e) {
      caught = e;
    }
    assert.ok(caught, "expected throw");
    assert.ok(caught instanceof AppError, "expected AppError instance");
    assert.strictEqual(caught.statusCode, 409);
    assert.strictEqual(caught.message, "Gagal membuat nomor BOQ karena permintaan bersamaan, silakan coba lagi.");
    assert.ok(caught.cause, "expected cause preserved");
    assert.strictEqual(caught.cause.message, "still unique");
    assert.strictEqual(calls, 3);
    console.log("  ok - withBoqNumberRetry throws 409 AppError after max retries");
    passed++;
  })().catch(e => { console.error("  FAIL - withBoqNumberRetry throws 409 AppError after max retries:", e.message); process.exitCode = 1; });

  console.log(`\n${passed} tests passed`);
})();