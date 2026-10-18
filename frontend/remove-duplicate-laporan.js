const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Remove the duplicate LaporanAuditPage (second one)
// Find the second "export default function LaporanAuditPage"
const firstExport = content.indexOf('export default function LaporanAuditPage() {');
const secondExport = content.indexOf('export default function LaporanAuditPage() {', firstExport + 1);

if (secondExport !== -1) {
  console.log('First export at:', firstExport);
  console.log('Second export at:', secondExport);
  
  // Find the end of the second export (the closing brace)
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let secondEnd = -1;
  
  for (let i = secondExport; i < content.length; i++) {
    const c = content[i];
    const prev = content[i-1];
    
    if (!inString && (c === '"' || c === "'" || c === '`')) {
      inString = true;
      stringChar = c;
    } else if (inString && c === stringChar && prev !== '\\') {
      inString = false;
    } else if (!inString) {
      if (c === '{') braceCount++;
      if (c === '}') {
        braceCount--;
        if (braceCount === 0) {
          secondEnd = i;
          break;
        }
      }
    }
  }
  
  if (secondEnd !== -1) {
    // Remove from secondExport to secondEnd (inclusive)
    const before = content.slice(0, secondExport);
    const after = content.slice(secondEnd + 1);
    content = before + after;
    console.log('Removed duplicate LaporanAuditPage');
  }
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');