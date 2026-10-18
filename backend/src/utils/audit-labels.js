"use strict";

const AKSI_LABELS = {
  create: "Dibuat",
  update: "Diperbarui",
  delete: "Dihapus",
  approve: "Disetujui",
  receive_inbound: "Terima Inbound",
  approve_inbound: "Setujui Inbound",
  approve_outbound: "Setujui Outbound",
  confirm_distributed: "Dikonfirmasi",
  reject_inbound: "Tolak Inbound",
  reject_outbound: "Tolak Outbound",
  putaway: "Penyimpanan",
  retrieve: "Pengambilan Stok",
  create_inbound: "Buat Inbound",
  create_outbound: "Buat Outbound",
  start_delivery: "Mulai Pengiriman",
  input_rekonsiliasi: "Input Rekonsiliasi",
  nonaktifkan_project: "Project Dinonaktifkan",
  aktifkan_project: "Project Diaktifkan",
  soft_delete: "Dihapus (Soft)",
  restore: "Dipulihkan",
  cancel_draft: "Batalkan Draft",
  report_arrival: "Lapor Tiba",
  login_success: "Login Berhasil",
  login_failed: "Login Gagal",
  tiba_di_transit: "Tiba di Transit",
  lanjut_dari_transit: "Lanjut dari Transit",
  reset_link_created: "Link Reset Dibuat",
};

const ENTITY_TYPE_LABELS = {
  user_account: "Akun Pengguna",
  boq: "BOQ",
  surat_jalan: "Surat Jalan",
  project: "Project",
  item: "Barang",
  personil: "Personil",
  vehicle: "Kendaraan",
  supplier: "Supplier",
  warehouse: "Gudang",
  titik_lapangan: "Titik Lapangan",
  cluster: "Cluster",
  reconciliation: "Rekonsiliasi",
};

const ROLE_LABELS = {
  admin_general: "Admin General",
  supervisor: "Supervisor",
  staf_gudang: "Staf Gudang",
};

const LOGIN_REASON_LABELS = {
  email_not_found: "Email tidak terdaftar",
  account_inactive: "Akun nonaktif",
  wrong_password: "Password salah",
};

function toTitleCase(input) {
  let text = String(input)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");
  if (text.endsWith(" Id")) {
    text = text.slice(0, -3).trim();
  }
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getAksiLabel(v) {
  if (AKSI_LABELS[v] !== undefined) return AKSI_LABELS[v];
  return toTitleCase(v);
}

function getEntityTypeLabel(v) {
  if (ENTITY_TYPE_LABELS[v] !== undefined) return ENTITY_TYPE_LABELS[v];
  return toTitleCase(v);
}

function getRoleLabel(v) {
  if (!v) return "Tidak dikenal";
  if (ROLE_LABELS[v] !== undefined) return ROLE_LABELS[v];
  return toTitleCase(v);
}

function getLoginReasonLabel(v) {
  if (LOGIN_REASON_LABELS[v] !== undefined) return LOGIN_REASON_LABELS[v];
  return toTitleCase(v);
}

function formatIp(ip) {
  if (!ip) return "-";
  const trimmed = String(ip).trim();
  if (trimmed === "::1") return "::1 (localhost)";
  if (trimmed === "127.0.0.1") return "127.0.0.1 (localhost)";
  return trimmed;
}

function formatUserAgent(ua) {
  if (!ua) return "-";
  const full = String(ua);
  let browser = "Lainnya";
  let os = "Lainnya";

  if (full.includes("Edg/")) browser = "Edge";
  else if (full.includes("Chrome/")) browser = "Chrome";
  else if (full.includes("Firefox/")) browser = "Firefox";
  else if (full.includes("Safari/")) browser = "Safari";

  const verMatch = full.match(/(Edg|Chrome|Firefox|Safari)\/(\d+)/);
  const version = verMatch ? ` ${verMatch[2]}` : "";

  if (full.includes("Windows")) os = "Windows";
  else if (full.includes("Macintosh") || full.includes("Mac OS")) os = "macOS";
  else if (full.includes("Linux")) os = "Linux";
  else if (full.includes("Android")) os = "Android";
  else if (full.includes("iPhone") || full.includes("iPad")) os = "iOS";

  const text = `${browser}${version} di ${os}`;
  return full.length <= 60 ? text : text.slice(0, 55) + "…";
}

function formatValue(key, value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number") return value.toLocaleString("id-ID");
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      if (value.length === 0) return "-";
      return value.map((item) => formatValue(key, item)).filter(Boolean).join(", ");
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function labelizeKey(key) {
  const map = {
    ip: "Alamat IP",
    userAgent: "Browser / Perangkat",
    user_agent: "Browser / Perangkat",
    email: "Email",
    reason: "Alasan",
  };
  if (map[key] !== undefined) return map[key];
  return toTitleCase(key);
}

function formatAuditMetadata(aksi, dataSebelum, dataSesudah) {
  const loginActions = new Set(["login_success", "login_failed", "reset_link_created"]);

  if (loginActions.has(aksi)) {
    const parts = [];
    const before = dataSebelum || {};
    if (before.email) parts.push(`Email: ${formatValue("email", before.email)}`);
    if (before.reason !== undefined && before.reason !== null && before.reason !== "")
      parts.push(`Alasan: ${getLoginReasonLabel(before.reason)}`);
    if (before.ip)
      parts.push(`IP: ${formatIp(before.ip)}`);
    if (before.userAgent || before.user_agent)
      parts.push(`Perangkat: ${formatUserAgent(before.userAgent || before.user_agent)}`);
    return parts.length > 0 ? parts.join("; ") : "-";
  }

  const allEntries = [];
  for (const [dataLabel, data] of [["Sebelum", dataSebelum], ["Sesudah", dataSesudah]]) {
    if (!data || typeof data !== "object") continue;
    const entries = Object.entries(data).filter(
      ([, v]) => v !== null && v !== undefined && v !== ""
    );
    for (const [k, v] of entries) {
      allEntries.push(`${dataLabel} ${labelizeKey(k)}: ${formatValue(k, v)}`);
    }
  }
  const text = allEntries.join("; ");
  if (text.length > 500) return text.slice(0, 497) + "…";
  return text || "-";
}

module.exports = {
  AKSI_LABELS,
  ENTITY_TYPE_LABELS,
  ROLE_LABELS,
  LOGIN_REASON_LABELS,
  getAksiLabel,
  getEntityTypeLabel,
  getRoleLabel,
  getLoginReasonLabel,
  formatIp,
  formatUserAgent,
  formatValue,
  labelizeKey,
  formatAuditMetadata,
};
