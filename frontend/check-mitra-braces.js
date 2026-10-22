const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the exact start and trace braces
const mitraStart = content.indexOf('function TabRiwayatInputMitra({ get }: { get: (url: string) => Promise<Response> }) {');
console.log('Start:', mitraStart);

// Trace braces from there
let braceCount = 0;
let inString = false;
let stringChar = '';
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
        console.log('Function ends at:', i);
        console.log('Content around end:', JSON.stringify(content.slice(i - 50, i + 50)));
        break;
      }
    }
  }
}