const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// The error is around line 1827 - let's find the specific div that's not closed
// It's in the desktop table section, around the Badge for tipe_surat_jalan
const idx = content.indexOf('<div className="flex flex-wrap items-center gap-2">\n                      <Badge\n                        label={r.tipe_surat_jalan === "inbound"');
if (idx !== -1) {
  console.log('Found at:', idx);
  // Find the </td> after this
  const tdEnd = content.indexOf('</td>', idx);
  console.log('Next </td> at:', tdEnd);
  console.log('Content between:', content.slice(idx, tdEnd + 5));
}