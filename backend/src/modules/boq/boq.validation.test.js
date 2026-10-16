const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { safeUrlSchema } = require("../boq/boq.validation");

async function parse(val) {
  return safeUrlSchema.safeParse(val);
}

describe("safeUrlSchema - allowlist URL validation", () => {
  describe("terima (valid)", () => {
    it("https URL", async () => {
      const result = await parse("https://example.com/a.pdf");
      assert.equal(result.success, true);
    });

    it("http URL", async () => {
      const result = await parse("http://localhost:5000/uploads/x.png");
      assert.equal(result.success, true);
    });

    it("relative path", async () => {
      const result = await parse("/uploads/a.pdf");
      assert.equal(result.success, true);
    });

    it("empty string (optional)", async () => {
      const result = await parse("");
      assert.equal(result.success, true);
    });

    it("null (optional)", async () => {
      const result = await parse(null);
      assert.equal(result.success, true);
    });

    it("undefined (optional)", async () => {
      const result = await parse(undefined);
      assert.equal(result.success, true);
    });

    it("https with uppercase scheme", async () => {
      const result = await parse("HTTPS://EXAMPLE.COM/A.PDF");
      assert.equal(result.success, true);
    });

    it("relative path with leading whitespace", async () => {
      const result = await parse("  /uploads/a.pdf  ");
      assert.equal(result.success, true);
    });
  });

  describe("tolak (invalid)", () => {
    it("javascript:alert(1)", async () => {
      const result = await parse("javascript:alert(1)");
      assert.equal(result.success, false);
    });

    it("JaVaScRiPt:alert(1)", async () => {
      const result = await parse(" JaVaScRiPt:alert(1)");
      assert.equal(result.success, false);
    });

    it("java\\tscript:alert(1)", async () => {
      const result = await parse("java\tscript:alert(1)");
      assert.equal(result.success, false);
    });

    it("java\\nscript:alert(1)", async () => {
      const result = await parse("java\nscript:alert(1)");
      assert.equal(result.success, false);
    });

    it("data:text/html", async () => {
      const result = await parse("data:text/html,<script>alert(1)</script>");
      assert.equal(result.success, false);
    });

    it("vbscript:x", async () => {
      const result = await parse("vbscript:x");
      assert.equal(result.success, false);
    });

    it("//evil.com/x", async () => {
      const result = await parse("//evil.com/x");
      assert.equal(result.success, false);
    });

    it("\\\\evil.com", async () => {
      const result = await parse("\\\\evil.com");
      assert.equal(result.success, false);
    });

    it("file:///etc/passwd", async () => {
      const result = await parse("file:///etc/passwd");
      assert.equal(result.success, false);
    });

    it("relative path with backslash", async () => {
      const result = await parse("/\\evil.com");
      assert.equal(result.success, false);
    });
  });
});
