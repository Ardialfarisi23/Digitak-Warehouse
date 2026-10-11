const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Check imports
for (let i = 0; i < 60; i++) {
  console.log(i+1 + ': ' + lines[i]);
}