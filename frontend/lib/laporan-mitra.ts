// Label & badge untuk jenis laporan mitra.
export type JenisLaporanMeta = {
  label: string;
  badgeClass: string;
};

export const JENIS_LAPORAN_META: Record<string, JenisLaporanMeta> = {
  manual: { label: "Input Manual", badgeClass: "bg-blue-50 text-blue-700" },
  excel: { label: "Upload Excel", badgeClass: "bg-emerald-50 text-emerald-700" },
  migrasi_sistem: { label: "Migrasi Sistem", badgeClass: "bg-violet-50 text-violet-700" },
};

export const BELUM_DIKONFIRMASI_LABEL = "Belum dikonfirmasi mitra";
export const BELUM_DIKONFIRMASI_BADGE_CLASS = "bg-amber-50 text-amber-700";

export const getJenisLaporanMeta = (jenis?: string | null): JenisLaporanMeta => {
  const key = String(jenis ?? "").trim();
  if (JENIS_LAPORAN_META[key]) return JENIS_LAPORAN_META[key];
  return { label: key || "-", badgeClass: "bg-slate-100 text-slate-600" };
};

// Laporan hasil migrasi sistem otomatis belum dikonfirmasi oleh mitra.
export const isBelumDikonfirmasiMitra = (row: { jenis_laporan?: string | null; pic_mitra?: string | null }) =>
  row.jenis_laporan === "migrasi_sistem" || !String(row.pic_mitra ?? "").trim();
