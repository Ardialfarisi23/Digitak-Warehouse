export const FIELD_LABELS: Record<string, string> = {
  must_change_password: "Wajib Ganti Password",
  is_aktif: "Status Aktif",
  status_aktif: "Status Aktif",
  picking_selesai: "Picking Selesai",
  is_kelebihan: "Kelebihan Kirim",
  override: "Override Kondisi",
  mos: "MOS (arsip)",
  used: "Used",
  source_file: "File Sumber",
  filename: "Nama File",
  nama_file: "Nama File",
  role: "Peran",
  catatan: "Catatan",
  nomor_surat_jalan: "Nomor Surat Jalan",
  status: "Status",
  kode_tiket: "Kode Tiket",
  username_target: "Username Target",
  target_user: "Username Target",
  user_target: "Username Target",
  tiket_id: "Tiket",
  surat_jalan_id: "Surat Jalan",
  gudang_asal_id: "Gudang Asal",
  gudang_tujuan_id: "Gudang Tujuan",
  project_id: "Project",
  boq_id: "BOQ",
  zona_id: "Zona",
  barang_id: "Barang",
  surat_jalan_item_id: "Item Surat Jalan",
  kondisi_diminta: "Kondisi Diminta",
  kondisi_diambil: "Kondisi Diambil",
  catatan_kondisi: "Catatan Override",
  return_id: "Return",
  items_updated: "Item Diperbarui",
  updated_fields: "Field Diperbarui",
  boq_number: "Nomor BOQ",
  item_count: "Jumlah Item",
  qty: "Qty",
  alasan_gagal: "Alasan Gagal",
  reason: "Alasan",
  jenis_laporan: "Jenis Laporan",
  pic_mitra: "PIC Mitra",
  nama_barang: "Nama Barang",
  latitude: "Latitude",
  longitude: "Longitude",
  nama_lokasi: "Nama Lokasi",
  alamat: "Alamat",
  method: "Metode",
  url: "URL",
  user_role: "Peran Pengguna",
  required_roles: "Peran Diperlukan",
  kode_perangkat: "Kode Perangkat",
  nama_project: "Nama Project",
  title: "Judul",
  area: "Area",
  klien: "Klien",
  kecamatan: "Kecamatan",
  desa_kelurahan: "Desa/Kelurahan",
  kota_kabupaten: "Kota/Kabupaten",
  provinsi: "Provinsi",
  cluster_id: "Cluster",
  nama_cluster: "Nama Cluster",
  cluster_type: "Tipe Cluster",
  project_type: "Tipe Project",
  alamat_lengkap: "Alamat Lengkap",
  kso_partner: "Mitra KSO",
  kso_contact: "Kontak KSO",
  no_tiket_release: "No. Tiket Release",
  vendor: "Vendor",
  homepass_plan: "Homepass Plan",
  nama: "Nama",
  posisi: "Jabatan",
  no_hp: "Telepon",
  nik: "NIK",
  email: "Email",
  gudang_id: "Gudang",
  bisa_menyetir: "Punya SIM",
  is_material_handler: "Material Handler",
  jenis_kendaraan: "Jenis Kendaraan",
  merk: "Merk",
  no_polisi: "Nomor Polisi",
  kapasitas_angkut: "Kapasitas Angkut",
  keterangan: "Keterangan",
  kode: "Kode",
  deskripsi: "Deskripsi",
  nama_gudang: "Nama Gudang",
  tipe: "Tipe",
  kapasitas_maksimum: "Kapasitas Maksimum",
  jenis: "Jenis",
  foto: "Foto",
  foto_url: "Foto",
  foto_path: "Foto",
  wajib_sn: "Wajib Serial Number",
  created_by: "Dibuat Oleh",
  updated_by: "Diperbarui Oleh",
  created_at: "Dibuat Pada",
  updated_at: "Diperbarui Pada",
  kategori_id: "Kategori",
  satuan_default_id: "Satuan Default",
  personil_id: "Personil",
  kendaraan_id: "Kendaraan",
  supplier_id: "Supplier",
  user_id: "Pengguna",
  pic_id: "PIC",
  ip: "Alamat IP",
  userAgent: "Browser / Perangkat",
  user_agent: "Browser / Perangkat",
};

export type ValueLabelGroup = Record<string, string>;

/**
 * Label bahasa Indonesia untuk setiap nilai `audit_log.entity_type`.
 * Sumber nilai: backend/src/modules (createAuditLog) dan
 * backend/src/modules/reconciliation/reconciliation.service.js.
 * JANGAN kembalikan key mentah (snake_case) ke UI.
 */
export const ENTITY_TYPE_LABELS: Record<string, string> = {
  boq: "BOQ",
  surat_jalan: "Surat Jalan",
  surat_jalan_item: "Item Surat Jalan",
  project: "Project",
  titik_lapangan: "Titik Lapangan",
  user_account: "Akun Pengguna",
  item: "Barang",
  personil: "Personil",
  vehicle: "Kendaraan",
  supplier: "Supplier",
  warehouse: "Gudang",
  cluster: "Cluster",
  zona: "Zona",
  tiket: "Tiket",
  tiket_material: "Tiket Material",
  reconciliation: "Rekonsiliasi",
  reconciliation_remains_note: "Catatan Remains",
  return: "Return",
  stok: "Stok",
};

/**
 * Label entity untuk Audit Log. Menanganya semua kasus:
 * - entity_type tidak dikenal  -> "Catatan Remains"-style label generik
 * - entity_id kosong/0         -> "-"
 * - tidak ada nama entitas     -> "-" (bukan "entity_type #id (data mungkin telah dihapus)")
 */
export function getEntityTypeLabel(entityType?: string | null): string {
  if (!entityType) return "-";
  const key = String(entityType).trim().toLowerCase();
  if (!key) return "-";
  return ENTITY_TYPE_LABELS[key] ?? EntityTypeFallbackLabel(key);
}

/** Ubah snake_case menjadi Title Case untuk entity_type di luar daftar. */
function EntityTypeFallbackLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}


export const VALUE_LABELS: Record<string, ValueLabelGroup> = {
  audit_aksi: {
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
  },
  surat_jalan_status: {
    draft_diajukan: "Draft",
    menunggu_verifikasi: "Menunggu Verifikasi",
    ready_putaway: "Siap Putaway",
    disetujui: "Disetujui",
    sedang_dikirim: "Sedang Dikirim",
    tiba_menunggu_konfirmasi: "Menunggu Konfirmasi",
    diterima_didistribusikan: "Diterima/Didistribusikan",
    ditolak: "Ditolak",
    digenerate: "Digenerate",
  },
  boq_status: {
    draft: "Draft",
    aktif: "Aktif",
    selesai: "Selesai",
    ditolak: "Ditolak",
  },
  return_status: {
    draft: "Draft",
    diajukan: "Diajukan",
    disetujui: "Disetujui",
    diterima_gudang: "Diterima di Gudang",
    ditolak: "Ditolak",
  },
  approval_status: {
    menunggu: "Menunggu",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
  },
  kondisi_barang: {
    baik: "Baik",
    rusak_ringan: "Rusak Ringan",
    rusak_berat: "Rusak Berat",
    tidak_sesuai_spek: "Tidak Sesuai Spek",
    doa: "DOA",
  },
  user_role: {
    admin_general: "Admin General",
    supervisor: "Supervisor",
    staf_gudang: "Staf Gudang",
  },
  login_reason: {
    email_not_found: "Email tidak terdaftar",
    account_inactive: "Akun nonaktif",
    wrong_password: "Password salah",
  },
  status_kecukupan_zona: {
    CUKUP: "Cukup",
    MENDEKATI_PENUH: "Mendekati Penuh",
    TIDAK_CUKUP: "Tidak Cukup",
  },
  external_verification_status: {
    terverifikasi: "Terverifikasi",
    menunggu: "Menunggu",
    tidak_berlaku: "Tidak Berlaku",
  },
  permintaan_boq_status: {
    diajukan: "Diajukan",
    ditinjau: "Ditinjau",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
  },
  reconciliation_detail_status: {
    berhasil: "Berhasil",
    gagal: "Gagal",
  },
  entity_type: {
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
  },
};

export const BOOLEAN_FIELDS: Set<string> = new Set([
  "must_change_password",
  "is_aktif",
  "status_aktif",
  "picking_selesai",
  "is_kelebihan",
  "override",
]);

function toTitleCase(input: string): string {
  let text = input.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  if (text.endsWith(" Id")) {
    text = text.slice(0, -3).trim();
  }
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function findValueLabel(value: string): string | undefined {
  const lowered = value.toLowerCase();
  for (const group of Object.values(VALUE_LABELS)) {
    if (group[value] !== undefined) return group[value];
    if (group[lowered] !== undefined) return group[lowered];
  }
  return undefined;
}

function isIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

export function humanizeKey(key: string): string {
  return FIELD_LABELS[key] ?? toTitleCase(key);
}

export function humanizeValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Ya" : "Tidak";
  }

  if (typeof value === "number") {
    return value.toLocaleString("id-ID");
  }

  if (value instanceof Date) {
    return value.toLocaleString("id-ID");
  }

  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (const item of value) {
      if (item === null || item === undefined) continue;
      if (typeof item === "boolean") {
        parts.push(item ? "Ya" : "Tidak");
      } else if (typeof item === "number") {
        parts.push(item.toLocaleString("id-ID"));
      } else {
        const text = humanizeValue(key, item);
        if (text !== "-") parts.push(text);
      }
    }
    if (parts.length === 0) return "-";
    return parts.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  const text = String(value);

  if (BOOLEAN_FIELDS.has(key) && (text === "true" || text === "false")) {
    return text === "true" ? "Ya" : "Tidak";
  }

  if (isIsoDateString(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("id-ID");
    }
  }

  const label = findValueLabel(text);
  if (label !== undefined) {
    return label;
  }

  return text;
}

export function getAksiLabel(aksi: string): string {
  return VALUE_LABELS.audit_aksi[aksi] ?? humanizeValue("aksi", aksi);
}

export function getRoleLabel(role?: string | null): string {
  if (!role) return "Tidak dikenal";
  return VALUE_LABELS.user_role[role] ?? role;
}

export function formatIp(ip: string | null | undefined): string {
  if (!ip) return "-";
  const trimmed = String(ip).trim();
  if (trimmed === "::1") return "::1 (localhost)";
  if (trimmed === "127.0.0.1") return "127.0.0.1 (localhost)";
  return trimmed;
}

export function formatUserAgent(ua: string | null | undefined): { text: string; title: string } {
  if (!ua) return { text: "-", title: "" };
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
  if (full.length <= 60) return { text, title: full };
  return { text: text.length > 55 ? text.slice(0, 55) + "…" : text, title: full };
}
