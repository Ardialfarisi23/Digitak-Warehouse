const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the exact content around line 1876
const idx = content.indexOf('                ))\n              )\n              )}');
if (idx !== -1) {
  console.log('Found at:', idx);
  console.log(JSON.stringify(content.slice(idx, idx + 100)));
} else {
  // Try with different whitespace
  const lines = content.split('\n');
  for (let i = 1870; i < Math.min(1885, lines.length); i++) {
    console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
  }
}