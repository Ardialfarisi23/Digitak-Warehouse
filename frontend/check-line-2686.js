const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Check line 2686
for (let i = 2680; i < Math.min(2700, lines.length); i++) {
  console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
}