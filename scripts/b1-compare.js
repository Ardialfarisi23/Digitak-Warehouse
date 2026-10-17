// Bandingkan baseline (xlsx lama) vs after (exceljs baru) secara otomatis.
const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "..", "tmp", "b1-baseline");
const afterDir = path.join(__dirname, "..", "tmp", "b1-after");

const files = fs.readdirSync(baseDir).filter((f) => f.endsWith(".json")).sort();

let allIdentical = true;
for (const f of files) {
  const a = JSON.parse(fs.readFileSync(path.join(baseDir, f), "utf8"));
  const b = JSON.parse(fs.readFileSync(path.join(afterDir, f), "utf8"));
  const identical = JSON.stringify(a.data) === JSON.stringify(b.data);
  if (!identical) allIdentical = false;
  console.log(`${identical ? "IDENTIK" : "BEDA"} ${f} (baseline ${a.rowCount} baris vs after ${b.rowCount} baris)`);
  if (!identical) {
    const diffs = [];
    const n = Math.max(a.data.length, b.data.length);
    for (let i = 0; i < n && diffs.length < 5; i += 1) {
      const ra = a.data[i] || {};
      const rb = b.data[i] || {};
      const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
      for (const k of keys) {
        const va = JSON.stringify(ra[k]);
        const vb = JSON.stringify(rb[k]);
        if (va !== vb) {
          diffs.push({ baris: i + 2, kolom: k, lama: ra[k], baru: rb[k] });
          if (diffs.length >= 5) break;
        }
      }
    }
    diffs.forEach((d) => console.log(`   baris=${d.baris} kolom=${d.kolom} lama=${JSON.stringify(d.lama)} baru=${JSON.stringify(d.baru)}`));
  }
}
console.log(allIdentical ? "\nSEMUA FILE IDENTIK" : "\nADA PERBEDAAN — perbaiki dan ulangi");
