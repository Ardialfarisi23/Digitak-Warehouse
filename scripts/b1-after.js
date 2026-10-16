// Parsing XLSX dengan exceljs (baru), output type-tagged sama seperti baseline.
const fs = require("fs");
const path = require("path");
const { parseReconciliationFileExceljs } = require("../backend/src/modules/reports/upload-parse");

const parseDir = path.join(__dirname, "..", "backend", "src", "uploads", "reconciliation");
const outDir = path.join(__dirname, "..", "tmp", "b1-after");

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

(async () => {
  const files = fs.readdirSync(parseDir).filter((f) => f.endsWith(".xlsx")).sort();
  let totalRows = 0;
  for (const f of files) {
    const filePath = path.join(parseDir, f);
    const { jsonData, sheetName } = await parseReconciliationFileExceljs(filePath);
    totalRows += jsonData.length;
    const out = {
      file: f,
      sheetName,
      rowCount: jsonData.length,
      data: serialize(jsonData),
    };
    fs.writeFileSync(path.join(outDir, f + ".json"), JSON.stringify(out, null, 2));
  }
  console.log(`after selesai: ${files.length} file, total ${totalRows} baris`);
  console.log("output: " + outDir);
})();
