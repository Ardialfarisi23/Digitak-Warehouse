const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Search for the specific pattern in the desktop table
const idx = content.indexOf('r.tipe_surat_jalan === "inbound" ? "Inbound"');
if (idx !== -1) {
  console.log('Found at:', idx);
  // Show surrounding context
  console.log(content.slice(Math.max(0, idx - 200), idx + 500));
}