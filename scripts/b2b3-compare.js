// Bandingkan baseline (sebelum) vs after (sesudah pemangkasan) secara deep-equal.
const fs = require("fs");
const path = require("path");

const beforeDir = path.join(__dirname, "..", "tmp", "b2b3-before");
const afterDir = path.join(__dirname, "..", "tmp", "b2b3-after");

const files = fs.readdirSync(beforeDir).filter((f) => f.endsWith(".json")).sort();
let allIdentical = true;

for (const f of files) {
  const a = JSON.parse(fs.readFileSync(path.join(beforeDir, f), "utf8"));
  const b = JSON.parse(fs.readFileSync(path.join(afterDir, f), "utf8"));
  const identical = JSON.stringify(a) === JSON.stringify(b);
  if (!identical) allIdentical = false;
  console.log(`${identical ? "IDENTIK" : "BEDA"} ${f}`);
  if (!identical) {
    const sa = JSON.stringify(a.data || a);
    const sb = JSON.stringify(b.data || b);
    const la = (a.data || []).length;
    const lb = (b.data || []).length;
    console.log(`   before rows=${la} after rows=${lb}`);
    // Tampilkan maksimal 5 perbedaan kunci tingkat atas
    const oa = a.data || a;
    const ob = b.data || b;
    const ka = Array.isArray(oa) ? oa : [oa];
    const kb = Array.isArray(ob) ? ob : [ob];
    let shown = 0;
    const n = Math.min(ka.length, kb.length);
    for (let i = 0; i < n && shown < 5; i += 1) {
      if (JSON.stringify(ka[i]) !== JSON.stringify(kb[i])) {
        const keys = new Set([...Object.keys(ka[i] || {}), ...Object.keys(kb[i] || {})]);
        for (const k of keys) {
          if (JSON.stringify(ka[i][k]) !== JSON.stringify(kb[i][k])) {
            console.log(`   baris${i} kolom=${k} before=${JSON.stringify(ka[i][k]).slice(0,80)} after=${JSON.stringify(kb[i][k]).slice(0,80)}`);
            shown += 1;
            if (shown >= 5) break;
          }
        }
      }
    }
  }
}
console.log(allIdentical ? "\nSEMUA CASE IDENTIK" : "\nADA PERBEDAAN — perbaiki dan ulangi");
