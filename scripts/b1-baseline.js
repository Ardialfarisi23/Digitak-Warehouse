// Baseline parsing XLSX dengan paket lama (xlsx) sebelum migrasi ke exceljs.
// Output: tmp/b1-baseline/<file>.json (type-tagged agar beda string/number/Date tercatat).
const fs = require("fs");
const path = require("path");
const { parseReconciliationFile } = require("../backend/src/modules/reports/upload-parse");

const parseDir = path.join(__dirname, "..", "backend", "src", "uploads", "reconciliation");
const outDir = path.join(__dirname, "..", "tmp", "b1-baseline");

function tag(value) {
  if (value === null) return { type: "null", value: null };
  if (value === undefined) return { type: "undefined", value: null };
  if (typeof value === "number") return { type: "number", value: value };
  if (typeof value === "boolean") return { type: "boolean", value: value };
  if (value instanceof Date) return { type: "date", value: value.toISOString() };
  if (typeof value === "string") return { type: "string", value: value };
  return { type: typeof value, value: String(value) };
}

function serialize(obj) {
  if (Array.isArray(obj)) return obj.map(serialize);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = serialize(obj[k]);
    return out;
  }
  return tag(obj);
}

fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(parseDir).filter((f) => f.endsWith(".xlsx")).sort();
let totalRows = 0;

for (const f of files) {
  const filePath = path.join(parseDir, f);
  const { jsonData, sheetName } = parseReconciliationFile(filePath);
  totalRows += jsonData.length;
  const out = {
    file: f,
    sheetName,
    rowCount: jsonData.length,
    data: serialize(jsonData),
  };
  fs.writeFileSync(path.join(outDir, f + ".json"), JSON.stringify(out, null, 2));
}

console.log(`baseline selesai: ${files.length} file, total ${totalRows} baris`);
console.log("output: " + outDir);
