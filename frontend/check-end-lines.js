const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Show lines around 2620-2630
for (let i = 2615; i < Math.min(2635, lines.length); i++) {
  console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
}