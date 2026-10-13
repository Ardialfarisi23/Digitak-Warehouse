const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the flex flex-wrap div
const idx = content.indexOf('flex flex-wrap items-center gap-2');
if (idx !== -1) {
  console.log('Found at:', idx);
  const tdEnd = content.indexOf('</td>', idx);
  console.log('Next </td> at:', tdEnd);
  console.log('Content between:', content.slice(idx, tdEnd + 5));
}