const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const search = 'role="tablist" aria-label="Tab laporan"';
const idx = content.indexOf(search);
if (idx !== -1) {
  console.log('Found at:', idx);
  console.log('Context:', JSON.stringify(content.slice(idx - 150, idx + 200)));
} else {
  console.log('Not found');
}