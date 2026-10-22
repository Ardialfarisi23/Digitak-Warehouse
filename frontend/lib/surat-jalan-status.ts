// ---------------------------------------------------------------------------
// Label status surat jalan — SATU sumber untuk semua halaman.
//
// Nilai PERSIS mengikuti enum `surat_jalan_status` di
// backend/prisma/schema.prisma:
//   draft_diajukan, menunggu_verifikasi, ready_putaway, disetujui,
//   sedang_dikirim, tiba_di_transit, tiba_menunggu_konfirmasi,
//   diterima_didistribusikan, ditolak, digenerate
//
// JANGAN buat map status lokal lagi di halaman lain — pakai helper ini.
// ---------------------------------------------------------------------------

export type SuratJalanStatus =
  | "draft_diajukan"
  | "menunggu_verifikasi"
  | "ready_putaway"
  | "disetujui"
  | "sedang_dikirim"
  | "tiba_di_transit"
  | "tiba_menunggu_konfirmasi"
  | "diterima_didistribusikan"
  | "ditolak"
  | "digenerate";

export const SURAT_JALAN_STATUS_LABEL: Record<SuratJalanStatus, string> = {
  draft_diajukan: "Menunggu Persetujuan Supervisor",
  menunggu_verifikasi: "Menunggu Verifikasi",
  ready_putaway: "Siap Putaway",
  disetujui: "Disetujui",
  sedang_dikirim: "Sedang Dikirim",
  tiba_di_transit: "Tiba di Gudang Transit",
  tiba_menunggu_konfirmasi: "Menunggu Konfirmasi",
  diterima_didistribusikan: "Diterima & Didistribusikan",
  ditolak: "Ditolak",
  digenerate: "Digenerate",
};

/**
 * Label siap tampil untuk sebuah status surat jalan.
 * - null/kosong -> "-"
 * - status dikenal -> label dari map di atas
 * - status tak dikenal -> kode asli, underscore jadi spasi, awal kata kapital
 */
export function getSuratJalanStatusLabel(status?: string | null): string {
  if (status === null || status === undefined) return "-";
  const raw = String(status).trim();
  if (!raw) return "-";

  const normalized = raw.toLowerCase();
  const label = SURAT_JALAN_STATUS_LABEL[normalized as SuratJalanStatus];
  if (label) return label;

  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Daftar nilai valid enum, berguna untuk opsi filter & validasi.
export const SURAT_JALAN_STATUS_VALUES = Object.keys(
  SURAT_JALAN_STATUS_LABEL
) as SuratJalanStatus[];
