const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find TabRiwayatStok component start
const startIdx = content.indexOf('function TabRiwayatStok({ get }: { get: (url: string) => Promise<Response> }) {');
console.log('TabRiwayatStok starts at:', startIdx);

if (startIdx !== -1) {
  // Count braces from there
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  for (let i = startIdx; i < content.length; i++) {
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
          console.log('Function ends at:', i);
          console.log('Context:', content.slice(i-50, i+50));
          break;
        }
      }
    }
  }
  console.log('Final brace count:', braceCount);
}