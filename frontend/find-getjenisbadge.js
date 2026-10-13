const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the td that renders getJenisBadge in the desktop table
const idx = content.indexOf('getJenisBadge(r)');
if (idx !== -1) {
  console.log('Found at:', idx);
  // Show context around it
  console.log(content.slice(Math.max(0, idx - 300), idx + 500));
}