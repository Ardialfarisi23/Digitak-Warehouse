"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  AKSI_LABELS,
  ENTITY_TYPE_LABELS,
  ROLE_LABELS,
  LOGIN_REASON_LABELS,
  getAksiLabel,
  getEntityTypeLabel,
  getRoleLabel,
  getLoginReasonLabel,
  formatAuditMetadata,
  formatIp,
  formatUserAgent,
} = require("./audit-labels");

describe("utils/audit-labels", () => {
  describe("AKSI_LABELS", () => {
    const enumAksi = [
      "create",
      "update",
      "delete",
      "approve",
      "receive_inbound",
      "approve_inbound",
      "approve_outbound",
      "confirm_distributed",
      "reject_inbound",
      "reject_outbound",
      "putaway",
      "retrieve",
      "create_inbound",
      "create_outbound",
      "start_delivery",
      "nonaktifkan_project",
      "aktifkan_project",
      "soft_delete",
      "restore",
      "input_rekonsiliasi",
      "login_success",
      "login_failed",
      "reset_link_created",
      "report_arrival",
      "tiba_di_transit",
      "lanjut_dari_transit",
      "cancel_draft",
    ];

    it("semua 27 nilai enum aksi punya label (bukan kode mentah)", () => {
      for (const aksi of enumAksi) {
        const label = getAksiLabel(aksi);
        assert.ok(label, `label kosong untuk ${aksi}`);
        assert.notStrictEqual(label, aksi, `label ${aksi} masih kode mentah`);
        assert.ok(AKSI_LABELS[aksi] !== undefined, `AKSI_LABELS[${aksi}] tidak terdefinisi`);
      }
    });

    it("nilai tidak dikenal fallback ke Title Case", () => {
      assert.strictEqual(getAksiLabel("aksi_tidak_diketahui"), "Aksi Tidak Diketahui");
      assert.strictEqual(getAksiLabel(""), "");
    });
  });

  describe("getEntityTypeLabel", () => {
    it("mengembalikan label entity yang benar", () => {
      assert.strictEqual(getEntityTypeLabel("user_account"), "Akun Pengguna");
      assert.strictEqual(getEntityTypeLabel("boq"), "BOQ");
      assert.strictEqual(getEntityTypeLabel("reconciliation"), "Rekonsiliasi");
    });

    it("nilai tidak dikenal fallback ke Title Case", () => {
      assert.strictEqual(getEntityTypeLabel("jenis_tidak_diketahui"), "Jenis Tidak Diketahui");
    });
  });

  describe("getRoleLabel", () => {
    it("mengembalikan label role yang benar", () => {
      assert.strictEqual(getRoleLabel("admin_general"), "Admin General");
      assert.strictEqual(getRoleLabel("supervisor"), "Supervisor");
      assert.strictEqual(getRoleLabel("staf_gudang"), "Staf Gudang");
    });

    it("role null/kosong mengembalikan 'Tidak dikenal'", () => {
      assert.strictEqual(getRoleLabel(null), "Tidak dikenal");
      assert.strictEqual(getRoleLabel(undefined), "Tidak dikenal");
      assert.strictEqual(getRoleLabel(""), "Tidak dikenal");
    });
  });

  describe("getLoginReasonLabel", () => {
    it("mengembalikan label reason yang benar", () => {
      assert.strictEqual(getLoginReasonLabel("email_not_found"), "Email tidak terdaftar");
      assert.strictEqual(getLoginReasonLabel("account_inactive"), "Akun nonaktif");
      assert.strictEqual(getLoginReasonLabel("wrong_password"), "Password salah");
    });

    it("nilai tidak dikenal fallback ke Title Case", () => {
      assert.strictEqual(getLoginReasonLabel("alasan_lain"), "Alasan Lain");
    });
  });

  describe("formatIp", () => {
    it("format localhost IP", () => {
      assert.strictEqual(formatIp("::1"), "::1 (localhost)");
      assert.strictEqual(formatIp("127.0.0.1"), "127.0.0.1 (localhost)");
    });

    it("IP lain apa adanya", () => {
      assert.strictEqual(formatIp("192.168.1.100"), "192.168.1.100");
    });

    it("null/undefined mengembalikan '-'", () => {
      assert.strictEqual(formatIp(null), "-");
      assert.strictEqual(formatIp(undefined), "-");
    });
  });

  describe("formatUserAgent", () => {
    it("deteksi Chrome di Windows", () => {
      const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/155.0.0.0 Safari/537.36";
      const result = formatUserAgent(ua);
      assert.ok(result.includes("Chrome"), `harus mengandung Chrome, dapat: ${result}`);
      assert.ok(result.includes("Windows"), `harus mengandung Windows, dapat: ${result}`);
    });

    it("deteksi Safari di macOS", () => {
      const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
      const result = formatUserAgent(ua);
      assert.ok(result.includes("Safari"), `harus mengandung Safari, dapat: ${result}`);
      assert.ok(result.includes("macOS"), `harus mengandung macOS, dapat: ${result}`);
    });

    it("UA pendek tanpa pola browser dikenal tampil fallback", () => {
      const ua = "CustomBrowser/1.0 UnknownOS";
      const result = formatUserAgent(ua);
      assert.ok(result.includes("Lainnya"), `harus fallback, dapat: ${result}`);
    });
  });

  describe("formatAuditMetadata", () => {
    it("login_success: IP, Perangkat", () => {
      const result = formatAuditMetadata(
        "login_success",
        { ip: "::1", userAgent: "Chrome/155 Windows" },
        null
      );
      assert.ok(result.includes("IP: ::1 (localhost)"), `harus ada IP localhost, dapat: ${result}`);
      assert.ok(result.includes("Perangkat"), `harus ada Perangkat, dapat: ${result}`);
    });

    it("login_failed email_not_found: Email, Alasan, IP, Perangkat", () => {
      const result = formatAuditMetadata(
        "login_failed",
        {
          email: "user@x.com",
          reason: "email_not_found",
          ip: "127.0.0.1",
          userAgent: "Firefox/120 Linux",
        },
        null
      );
      assert.ok(result.includes("Email: user@x.com"), `harus ada Email, dapat: ${result}`);
      assert.ok(result.includes("Alasan: Email tidak terdaftar"), `harus ada Alasan, dapat: ${result}`);
      assert.ok(result.includes("127.0.0.1 (localhost)"), `harus ada IP localhost, dapat: ${result}`);
      assert.ok(result.includes("Perangkat"), `harus ada Perangkat, dapat: ${result}`);
    });

    it("create/update biasa: key-value berurutan Sebelum/Sesudah", () => {
      const result = formatAuditMetadata(
        "create",
        { nama_barang: "Router", qty: 5 },
        { nama_barang: "Router Pro", qty: 10 }
      );
      assert.ok(result.includes("Sebelum Nama Barang: Router"), `dapat: ${result}`);
      assert.ok(result.includes("Sesudah Nama Barang: Router Pro"), `dapat: ${result}`);
      assert.ok(result.includes("Sebelum Qty: 5"), `dapat: ${result}`);
    });

    it("null data tidak crash", () => {
      assert.strictEqual(formatAuditMetadata("create", null, null), "-");
      assert.strictEqual(formatAuditMetadata("update", undefined, undefined), "-");
    });

    it("boolean tampil Ya/Tidak", () => {
      const result = formatAuditMetadata("update", { is_aktif: true, wajib_sn: false }, null);
      assert.ok(result.includes("Ya"), `harus ada Ya, dapat: ${result}`);
      assert.ok(result.includes("Tidak"), `harus ada Tidak, dapat: ${result}`);
    });

    it("nilai objek tidak tampil [object Object]", () => {
      const result = formatAuditMetadata("update", { config: { nested: true } }, null);
      assert.ok(!result.includes("[object Object]"), `tidak boleh [object Object], dapat: ${result}`);
    });

    it("batasi panjang 500 karakter", () => {
      const longValue = "x".repeat(600);
      const result = formatAuditMetadata("update", { keterangan: longValue }, null);
      assert.ok(result.length <= 503, `terlalu panjang: ${result.length}`);
      assert.ok(result.endsWith("…"), `harus diakhiri …`);
    });
  });
});
