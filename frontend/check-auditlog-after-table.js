const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Show TabAuditLog after desktop table (around line 740-760)
for (let i = 740; i < Math.min(780, lines.length); i++) {
  console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
}