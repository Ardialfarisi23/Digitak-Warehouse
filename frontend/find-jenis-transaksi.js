const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Search for the desktop table's Jenis Transaksi column - it should have the flex flex-wrap
const idx = content.indexOf('Jenis Transaksi');
if (idx !== -1) {
  console.log('Found at:', idx);
  // Show surrounding context - look for the td that renders this
  const before = content.slice(Math.max(0, idx - 500), idx);
  console.log('Before:', before.slice(-300));
  const after = content.slice(idx, idx + 1000);
  console.log('After:', after.slice(0, 500));
}