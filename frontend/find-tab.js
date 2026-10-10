const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const idx = content.indexOf('role="tablist" aria-label="Tab laporan"');
if (idx !== -1) {
  console.log('Found at:', idx);
  console.log('Context:', JSON.stringify(content.slice(idx - 100, idx + 100)));
} else {
  console.log('Not found');
}