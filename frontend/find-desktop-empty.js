const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the desktop table empty state - it's in the tbody section
const idx = content.indexOf('data.length === 0 ? (', 79663);
if (idx !== -1) {
  console.log('Found at:', idx);
  console.log(content.slice(idx, idx + 2000));
}