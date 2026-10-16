const XLSX = require("xlsx");
const ExcelJS = require("exceljs");
const fs = require("fs");

const normalizeHeaderKey = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const RECONCILIATION_REQUIRED_COLUMNS = [
  { name: "Kode Tiket", aliases: ["Kode Tiket", "kode_tiket", "KODE_TIKET"] },
  { name: "Project Name", aliases: ["Project Name", "Project", "project", "Nama Project"] },
  { name: "Nama Barang", aliases: ["Nama Barang", "nama_barang", "Barang"] },
  { name: "Angka Used", aliases: ["Angka Used", "Used", "used"] },
  { name: "Kondisi", aliases: ["Kondisi", "kondisi", "KONDISI"] },
  { name: "Keterangan", aliases: ["Keterangan", "Catatan", "catatan"] },
];

const RECONCILIATION_OPTIONAL_COLUMNS = [
  { name: "Cluster ID", aliases: ["Cluster ID", "cluster_id"] },
  { name: "Cluster Name", aliases: ["Cluster Name", "cluster_name", "Nama Cluster", "nama_cluster"] },
];

const RECONCILIATION_COLUMN_ALIASES = {};
[...RECONCILIATION_REQUIRED_COLUMNS, ...RECONCILIATION_OPTIONAL_COLUMNS].forEach((col) => {
  RECONCILIATION_COLUMN_ALIASES[col.name] = col.aliases;
});

const findMissingReconciliationColumns = (rowKeys) => {
  const normalizedKeys = rowKeys.map(normalizeHeaderKey);
  return RECONCILIATION_REQUIRED_COLUMNS.filter(
    (col) => !col.aliases.some((alias) => normalizedKeys.includes(normalizeHeaderKey(alias)))
  ).map((col) => col.name);
};

const pickRowValue = (row, aliases) => {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeaderKey(alias);
    for (const key of Object.keys(row)) {
      if (normalizeHeaderKey(key) === normalizedAlias) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== "") return value;
      }
    }
  }
  return null;
};

const readReconciliationRow = (row) => {
  const usedRaw = pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Angka Used"]);
  return {
    kodeTiket: pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Kode Tiket"]),
    projectName: pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Project Name"]),
    namaBarang: pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Nama Barang"]),
    used: usedRaw === null ? 0 : Number(usedRaw),
    kondisi: pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Kondisi"]),
    catatan: pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Keterangan"]),
  };
};

const normalizeTicketKey = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toUpperCase();

// Parsi berkas XLSX dengan paket lama (xlsx). Hasil: jsonData (array baris,
// baris pertama = header, nilai mentah) tanpa transformasi tambahan.
const parseReconciliationFile = (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  return { jsonData, sheetName };
};

// Parsi berkas XLSX dengan exceljs (async). Output bentuk jsonData identik
// dengan implementasi lama: array objek, kunci = header baris pertama, nilai
// mentah per sel, sel kosong = undefined.
const cellValue = (cell) => {
  if (cell == null) return undefined;
  const v = cell.value;
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    // Rich text: gabungkan teks (penggunaan mirip sheet_to_json).
    return v.map((part) => (part && part.t ? part.t : String(part))).join("");
  }
  if (v && typeof v === "object" && v.result !== undefined) {
    // Sel formula: ambil hasil perhitungan, bukan objek formula.
    return v.result;
  }
  if (v instanceof Date) return v;
  return v;
};

const parseReconciliationFileExceljs = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  const sheetName = worksheet.name;

  const rows = [];
  worksheet.eachRow((row) => rows.push(row));
  if (rows.length === 0) return { jsonData: [], sheetName };

  const headerRow = rows[0];
  const headers = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cellValue(cell);
  });

  const jsonData = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const obj = {};
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber - 1];
      if (key !== undefined && key !== null && key !== "") {
        obj[key] = cellValue(cell);
      }
    });
    // Pastikan semua kunci header ada (sel kosong = undefined), seperti sheet_to_json.
    for (let h = 0; h < headers.length; h += 1) {
      if (!(headers[h] in obj)) obj[headers[h]] = undefined;
    }
    jsonData.push(obj);
  }
  return { jsonData, sheetName };
};

module.exports = {
  XLSX,
  ExcelJS,
  normalizeHeaderKey,
  RECONCILIATION_REQUIRED_COLUMNS,
  RECONCILIATION_OPTIONAL_COLUMNS,
  RECONCILIATION_COLUMN_ALIASES,
  findMissingReconciliationColumns,
  pickRowValue,
  readReconciliationRow,
  normalizeTicketKey,
  parseReconciliationFile,
  parseReconciliationFileExceljs,
  cellValue,
};
