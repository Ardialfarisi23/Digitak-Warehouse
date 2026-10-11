const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Search for the table body rendering
const idx = content.indexOf('tbody className="divide-y divide-slate-50"');
if (idx !== -1) {
  console.log('tbody at:', idx);
  // Show the first few rows
  console.log(content.slice(idx, idx + 2000));
}