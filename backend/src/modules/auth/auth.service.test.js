const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { sanitizeEmailForAudit, parseTimeToMs } = require("./auth.service");

describe("auth.service - pure helpers", () => {
  describe("sanitizeEmailForAudit", () => {
    it("lowercases valid email", () => {
      assert.equal(sanitizeEmailForAudit("User@Example.COM"), "user@example.com");
    });

    it("trims whitespace and lowercases", () => {
      assert.equal(sanitizeEmailForAudit("  Test@Email.Com  "), "test@email.com");
    });

    it("truncates to 100 characters", () => {
      const longEmail = "a".repeat(95) + "@example.com";
      const result = sanitizeEmailForAudit(longEmail);
      assert.equal(result.length, 100);
    });

    it("returns fallback for non-email string", () => {
      assert.equal(sanitizeEmailForAudit("not-an-email"), "[input bukan format email]");
    });

    it("returns fallback for empty string", () => {
      assert.equal(sanitizeEmailForAudit(""), "[input bukan format email]");
    });

    it("returns fallback for null", () => {
      assert.equal(sanitizeEmailForAudit(null), "[input bukan format email]");
    });

    it("returns fallback for undefined", () => {
      assert.equal(sanitizeEmailForAudit(undefined), "[input bukan format email]");
    });

    it("returns fallback for password-like input (no @)", () => {
      assert.equal(sanitizeEmailForAudit("mypassword123"), "[input bukan format email]");
    });

    it("returns fallback for input with spaces", () => {
      assert.equal(sanitizeEmailForAudit("user @example.com"), "[input bukan format email]");
    });

    it("accepts email with subdomain", () => {
      assert.equal(sanitizeEmailForAudit("user@sub.example.com"), "user@sub.example.com");
    });

    it("accepts email with plus sign", () => {
      assert.equal(sanitizeEmailForAudit("user+tag@example.com"), "user+tag@example.com");
    });
  });

  describe("parseTimeToMs", () => {
    it("parses days", () => {
      assert.equal(parseTimeToMs("3d"), 3 * 24 * 60 * 60 * 1000);
    });

    it("parses hours", () => {
      assert.equal(parseTimeToMs("24h"), 24 * 60 * 60 * 1000);
    });

    it("parses minutes", () => {
      assert.equal(parseTimeToMs("60m"), 60 * 60 * 1000);
    });

    it("parses seconds", () => {
      assert.equal(parseTimeToMs("30s"), 30 * 1000);
    });

    it("returns 0 for invalid format", () => {
      assert.equal(parseTimeToMs("invalid"), 0);
    });

    it("returns 0 for non-string", () => {
      assert.equal(parseTimeToMs(null), 0);
      assert.equal(parseTimeToMs(123), 0);
    });
  });
});