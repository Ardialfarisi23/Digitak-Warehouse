export const FIELD_LABELS: Record<string, string> = {
  must_change_password: "Wajib Ganti Password",
  is_aktif: "Akun Aktif",
  status_aktif: "Status Aktif",
  picking_selesai: "Picking Selesai",
  is_kelebihan: "Kelebihan Kirim",
  override: "Override Kondisi",
  mos: "MOS (arsip)",
  remains_lapangan: "Remains di Lapangan",
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
};

export type ValueLabelGroup = Record<string, string>;

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
    nonaktifkan_project: "Project Dinonaktifkan",
    aktifkan_project: "Project Diaktifkan",
    soft_delete: "Dihapus (Soft)",
    restore: "Dipulihkan",
    cancel_draft: "Batalkan Draft",
    report_arrival: "Lapor Tiba",
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
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

  return toTitleCase(text);
}
