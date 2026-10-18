const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the desktop table empty state - search after the tbody
const tbodyIdx = content.indexOf('tbody className="divide-y divide-slate-50"', 79000);
if (tbodyIdx !== -1) {
  console.log('tbody at:', tbodyIdx);
  // Find the empty state within this tbody
  const emptyIdx = content.indexOf('data.length === 0 ? (', tbodyIdx);
  if (emptyIdx !== -1) {
    console.log('Empty state at:', emptyIdx);
    console.log(content.slice(emptyIdx, emptyIdx + 2000));
  }
}