const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 2615; i < Math.min(2635, lines.length); i++) {
  console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
}