const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Check line 2607
for (let i = 2600; i < Math.min(2620, lines.length); i++) {
  console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
}