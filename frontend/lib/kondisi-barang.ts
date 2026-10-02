export const KONDISI_LABEL: Record<string, string> = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_berat: "Rusak Berat",
  tidak_sesuai_spek: "Tidak Sesuai Spek",
  doa: "DOA",
};

export function getKondisiLabel(value?: string | null): string {
  if (!value) return "-";
  const normalized = String(value).trim().toLowerCase();
  if (KONDISI_LABEL[normalized]) return KONDISI_LABEL[normalized];
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
