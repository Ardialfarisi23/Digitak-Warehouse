const fs = require("fs");
const path = require("path");
process.env.NODE_PATH = path.resolve(__dirname, "..", "frontend", "node_modules");
require("module").Module._initPaths();
const ExcelJS = require("exceljs");

const beforeDir = path.join(__dirname, "..", "tmp", "b8-before");
const afterDir = path.join(__dirname, "..", "tmp", "b8-after");

async function readXlsx(p) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(p);
  return wb;
}

function dumpSheet(ws) {
  let cells = [];
  ws.eachRow({ includeEmpty: true }, (row, rowNum) => {
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cells.push({ r: rowNum, c: colNum, v: cell.value, n: cell.numFmt });
    });
  });
  const merges = Object.keys(ws.mergedCells || {}).sort();
  const cols = (ws.columns || []).map((c) => ({ w: c.width }));
  const headerFill = ws.getCell(1, 1).fill;
  return { name: ws.name, dims: ws.dimensions, merges, cols, cells, headerFill };
}

(async () => {
  for (const N of [359, 5000]) {
    const bp = path.join(beforeDir, `N${N}.xlsx`);
    const ap = path.join(afterDir, `N${N}.xlsx`);
    if (!fs.existsSync(bp) || !fs.existsSync(ap)) {
      console.log(`N${N}: files missing`);
      continue;
    }
    const wb1 = await readXlsx(bp);
    const wb2 = await readXlsx(ap);
    // compare all sheets by name
    const names1 = wb1.worksheets.map((w) => w.name);
    const names2 = wb2.worksheets.map((w) => w.name);
    if (JSON.stringify(names1) !== JSON.stringify(names2)) {
      console.log(`N${N}: SHEET NAMES DIFFER`, names1, names2);
    }
    let allMatch = true;
    for (let i = 0; i < wb1.worksheets.length; i++) {
      const d1 = dumpSheet(wb1.worksheets[i]);
      const d2 = dumpSheet(wb2.worksheets[i]);
      const json1 = JSON.stringify(d1);
      const json2 = JSON.stringify(d2);
      if (json1 === json2) {
        console.log(`N${N} sheet=${d1.name}: IDENTIK (${d1.cells.length} sel, ${d1.merges.length} merge)`);
      } else {
        allMatch = false;
        console.log(`N${N} sheet=${d1.name}: BEDA`);
        // find first few differences
        const merged1 = d1.merges;
        const merged2 = d2.merges;
        console.log("   merges before:", merged1.length, " after:", merged2.length);
        if (JSON.stringify(merged1) !== JSON.stringify(merged2)) console.log("   merge mismatch");
        if (d1.cells.length !== d2.cells.length) console.log("   cell count before:", d1.cells.length, "after:", d2.cells.length);
        // show up to 5 cell value mismatches
        const map = new Map(d2.cells.map((c) => [`${c.r},${c.c}`, c]));
        let shown = 0;
        for (const c1 of d1.cells) {
          const c2 = map.get(`${c1.r},${c1.c}`);
          if (!c2 || JSON.stringify(c1.v) !== JSON.stringify(c2.v) || c1.n !== c2.n) {
            console.log(`   r=${c1.r} c=${c1.c} before=${JSON.stringify(c1.v).slice(0,60)} after=${c2 ? JSON.stringify(c2.v).slice(0,60) : "MISSING"} numFmt ${c1.n} vs ${c2 ? c2.n : "?"}`);
            shown += 1;
            if (shown >= 5) break;
          }
        }
      }
    }
  }
  process.exit(0);
})();
