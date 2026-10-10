const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
// Find tab buttons
const idx = content.indexOf('aria-selected={active}');
if (idx !== -1) {
  console.log('Found at:', idx);
  console.log('Context:', JSON.stringify(content.slice(idx - 300, idx + 100)));
} else {
  console.log('Not found');
}