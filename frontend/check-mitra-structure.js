const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find TabRiwayatInputMitra component start and check structure
const mitraStart = content.indexOf('function TabRiwayatInputMitra() {');
if (mitraStart !== -1) {
  console.log('Found at:', mitraStart);
  // Find the end of this function
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let pos = mitraStart;
  for (let i = mitraStart; i < content.length; i++) {
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
          pos = i + 1;
          break;
        }
      }
    }
  }
  console.log('Function ends at:', pos);
  console.log('Content at end:', JSON.stringify(content.slice(pos - 50, pos + 50)));
}