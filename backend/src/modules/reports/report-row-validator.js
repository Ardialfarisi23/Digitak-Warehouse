// Validator bersama untuk baris laporan mitra.
// Dipakai oleh upload Excel (preview) dan form manual (submit) agar aturan
// angka Used, kondisi barang, dan tanggal laporan selalu sama.

// Nilai enum kondisi_barang yang sah.
const KONDISI_BARANG_VALUES = ["baik", "rusak_ringan", "rusak_berat", "tidak_sesuai_spek", "doa"];

const KONDISI_BARANG_LABEL = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_berat: "Rusak Berat",
  tidak_sesuai_spek: "Tidak Sesuai Spek",
  doa: "Doa",
};

// Ubah label kondisi ("Rusak Ringan") menjadi nilai enum ("rusak_ringan").
// Nilai yang tidak dikenal menghasilkan null.
const normalizeKondisi = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  const withUnderscore = normalized.replace(/[\s-]+/g, "_");
  if (KONDISI_BARANG_VALUES.includes(withUnderscore)) return withUnderscore;
  return null;
};

// Angka (Used/MOS) wajib berupa angka, tidak boleh negatif, dan boleh desimal.
const validateNumberValue = (value, { label, wajibDiisi = false }) => {
  if (value === null || value === undefined || value === "") {
    if (wajibDiisi) return { value: null, error: `${label} wajib diisi.` };
    return { value: 0, error: null };
  }
  const num = Number(value);
  if (!Number.isFinite(num)) return { value: null, error: `${label} harus berupa angka.` };
  if (num < 0) return { value: null, error: `${label} tidak boleh negatif.` };
  return { value: num, error: null };
};

// Kondisi barang harus salah satu nilai yang dikenal.
const validateKondisiValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { value: null, error: null };
  }
  const normalized = normalizeKondisi(value);
  if (normalized) return { value: normalized, error: null };
  const pilihan = KONDISI_BARANG_VALUES.map((item) => KONDISI_BARANG_LABEL[item]).join(", ");
  return { value: null, error: `Kondisi tidak valid. Pilihan yang tersedia: ${pilihan}.` };
};

// Ubah input tanggal menjadi tanggal kalender (tanpa jam) agar perbandingan tidak
// bergantung zona waktu.
const toDateOnly = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

// Tanggal laporan tidak boleh di masa depan (maksimal hari ini).
const validateReportDateValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return { value: new Date(), error: null };
  }
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return { value: null, error: "Tanggal laporan tidak valid." };
  const today = toDateOnly(new Date());
  if (dateOnly.getTime() > today.getTime()) {
    return { value: null, error: "Tanggal laporan tidak boleh melebihi hari ini." };
  }
  return { value: dateOnly, error: null };
};

// Validasi lengkap satu baris laporan mitra.
const validateReportRow = ({ used, kondisi, tanggal_laporan } = {}) => {
  const errors = [];

  const usedResult = validateNumberValue(used, { label: "Angka Used", wajibDiisi: true });
  if (usedResult.error) errors.push(usedResult.error);

  const kondisiResult = validateKondisiValue(kondisi);
  if (kondisiResult.error) errors.push(kondisiResult.error);

  const dateResult = validateReportDateValue(tanggal_laporan);
  if (dateResult.error) errors.push(dateResult.error);

  return {
    valid: errors.length === 0,
    errors,
    values: {
      used: usedResult.error ? 0 : usedResult.value,
      kondisi: kondisiResult.value,
      tanggal_laporan: dateResult.value,
    },
  };
};

module.exports = {
  KONDISI_BARANG_VALUES,
  KONDISI_BARANG_LABEL,
  normalizeKondisi,
  validateNumberValue,
  validateKondisiValue,
  validateReportDateValue,
  validateReportRow,
  toDateOnly,
};
