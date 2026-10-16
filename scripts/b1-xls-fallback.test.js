// Tes jalur parsing .xls (fallback ke paket xlsx) vs fungsi lama.
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const XLSX = require("../backend/node_modules/xlsx");
const {
  parseReconciliationFileExceljs,
  parseReconciliationFile,
  parseReconciliationFileXls,
} = require("../backend/src/modules/reports/upload-parse");

const tmpDir = path.join(__dirname, "..", "tmp", "b1-xls-test");
fs.mkdirSync(tmpDir, { recursive: true });

// Buat file .xls kecil (format biner OLE2 / BIFF8) secara programatik.
const workbook = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ["Kode Tiket", "Project Name", "Nama Barang", "Angka Used", "Kondisi", "Keterangan"],
  ["TKT-001", "Projekt A", "Tiang 7 Meter", 3, "Baik", "Kondisi baik"],
  ["TKT-002", "Projekt B", "Kabel Fiber", 5, "rusak ringan", ""],
]);
XLSX.utils.book_append_sheet(workbook, ws, "Sheet1");
const xlsBuffer = XLSX.write(workbook, { bookType: "biff8", type: "buffer" });
const xlsPath = path.join(tmpDir, "contoh.xls");
fs.writeFileSync(xlsPath, xlsBuffer);

(async () => {
  let passed = 0;
  let failed = 0;

  // 1. parseReconciliationFileXls(buffer) berjalan pada .xls buffer
  try {
    const r = parseReconciliationFileXls(xlsBuffer);
    assert.strictEqual(r.sheetName, "Sheet1");
    assert.strictEqual(r.jsonData.length, 2);
    assert.strictEqual(r.jsonData[0]["Kode Tiket"], "TKT-001");
    assert.strictEqual(r.jsonData[0]["Angka Used"], 3);
    passed += 1;
  } catch (e) { failed += 1; console.log("GAGAL parseReconciliationFileXls:", e.message); }

  // 2. parseReconciliationFileExceljs(xlsPath) routing ke xls path, output identik fungsi lama
  try {
    const rNew = await parseReconciliationFileExceljs(xlsPath);
    const rOld = parseReconciliationFile(xlsPath);
    assert.deepStrictEqual(JSON.stringify(rNew.jsonData), JSON.stringify(rOld.jsonData));
    assert.strictEqual(rNew.sheetName, rOld.sheetName);
    passed += 1;
  } catch (e) { failed += 1; console.log("GAGAL deep-equal xls:", e.message); }

  // 3. .xlsx tetap melalui exceljs (regressi): pakai file contoh xlsx yang ada
  const xlsxDir = path.join(__dirname, "..", "backend", "src", "uploads", "reconciliation");
  const xlsxFiles = fs.readdirSync(xlsxDir).filter((f) => f.endsWith(".xlsx")).sort();
  let xlsxOk = 0;
  for (const f of xlsxFiles) {
    try {
      const r = await parseReconciliationFileExceljs(path.join(xlsxDir, f));
      assert.ok(Array.isArray(r.jsonData));
      xlsxOk += 1;
    } catch (e) { failed += 1; console.log("GAGAL xlsx regressi:", f, e.message); }
  }
  passed += xlsxOk;

  console.log(`\nTes .xls: ${passed} lulus, ${failed} gagal (${xlsxOk} file xlsx regressi lulus)`);
  process.exit(failed > 0 ? 1 : 0);
})();
