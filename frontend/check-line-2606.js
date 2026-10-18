const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Find which function ends at line 2606
for (let i = 2590; i < 2610; i++) {
  console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
}