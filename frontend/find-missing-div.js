const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the missing closing div - it should be before line 1842 (</td>)
// Line 1827 opens <div className="flex flex-wrap items-center gap-2"> but no closing </div>

// Find the exact location
const searchStr = '<div className="flex flex-wrap items-center gap-2">\n                      <Badge\n                        label={r.tipe_surat_jalan === "inbound" ? "Inbound" : r.tipe_surat_jalan === "outbound" ? "Outbound" : r.tipe_surat_jalan || "-"}';
const idx = content.indexOf(searchStr);
if (idx !== -1) {
  console.log('Found at:', idx);
  // Find the </td> after this
  const tdEnd = content.indexOf('</td>', idx);
  console.log('Next </td> at:', tdEnd);
  console.log('Content between:', content.slice(idx, tdEnd + 5));
}