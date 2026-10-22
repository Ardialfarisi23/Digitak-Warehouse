const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Check TabAuditLog ternary structure (first tbody at 27386)
const lines = content.split('\n');
for (let i = 2780; i < Math.min(2820, lines.length); i++) {
  console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
}