const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');
// TabAuditLog tbody is around line 27386 in the file, which is around line 27386/1.3 = 21000 in 0-indexed
// But lines array is 0-indexed, so line 27386 is lines[27385]
// Let me search for the ternary in TabAuditLog
const idx = content.indexOf('loading ? (', 27000);
console.log('TabAuditLog loading at:', idx);
if (idx !== -1) {
  // Find line number
  const before = content.slice(0, idx);
  const lineNum = before.split('\n').length;
  console.log('Line number:', lineNum);
  // Show context
  const lineStart = Math.max(0, lineNum - 10);
  for (let i = lineStart; i < Math.min(lineNum + 30, lines.length); i++) {
    console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
  }
}