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

// Satu unit fisik hasil penilaian kondisi saat penerimaan inbound.
// Bentuknya mengikuti relasi `units` di surat_jalan_item.
export type KondisiUnit = {
  unit_id?: number | string;
  nomor_unit?: number | null;
  kondisi?: string | null;
  catatan?: string | null;
};

// Urutan tingkat keparahan, dari paling ringan ke paling berat.
const KONDISI_URUTAN: Record<string, number> = {
  baik: 0,
  rusak_ringan: 1,
  tidak_sesuai_spek: 2,
  rusak_berat: 3,
  doa: 4,
};

export type BarisKondisiUnit = {
  nomor: number;
  kondisi: string;
  catatan: string | null;
};

// Item lama (sebelum fitur penilaian per unit) tidak punya baris unit sama sekali.
export function hasKondisiUnit(units?: KondisiUnit[] | null): boolean {
  return Array.isArray(units) && units.some((unit) => Boolean(unit?.kondisi));
}

// Baris unit siap tampil, sudah diurutkan berdasarkan nomor unit.
export function getKondisiUnitRows(units?: KondisiUnit[] | null): BarisKondisiUnit[] {
  if (!Array.isArray(units)) return [];
  return units
    .filter((unit): unit is KondisiUnit => Boolean(unit && unit.kondisi))
    .map((unit, idx) => ({
      nomor: Number.isFinite(Number(unit.nomor_unit)) ? Number(unit.nomor_unit) : idx + 1,
      kondisi: String(unit.kondisi),
      catatan: unit.catatan && String(unit.catatan).trim() !== "" ? String(unit.catatan) : null,
    }))
    .sort((a, b) => a.nomor - b.nomor);
}

// Ringkasan jumlah unit per kondisi, diurut dari kondisi paling berat.
export function summarizeKondisiUnits(
  units?: KondisiUnit[] | null,
): Array<{ value: string; label: string; total: number }> {
  const totals = new Map<string, number>();
  for (const row of getKondisiUnitRows(units)) {
    const key = row.kondisi.trim().toLowerCase();
    totals.set(key, (totals.get(key) || 0) + 1);
  }
  return Array.from(totals.entries())
    .map(([value, total]) => ({ value, label: KONDISI_LABEL[value] || getKondisiLabel(value), total }))
    .sort((a, b) => {
      const rankA = KONDISI_URUTAN[a.value] ?? -1;
      const rankB = KONDISI_URUTAN[b.value] ?? -1;
      if (rankA !== rankB) return rankB - rankA;
      return a.label.localeCompare(b.label, "id-ID");
    });
}

// Teks ringkas untuk PDF/dokumen, contoh: "Baik 6, Rusak Berat 2".
export function formatRingkasanKondisiUnits(units?: KondisiUnit[] | null): string {
  return summarizeKondisiUnits(units)
    .map((entry) => `${entry.label} ${entry.total}`)
    .join(", ");
}
