const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const start = content.indexOf('function Modal({ open, onClose, title, children, className }');
let braceCount = 0;
let inString = false;
let stringChar = '';
let pos = start;
for (let i = start; i < content.length; i++) {
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
console.log('Full Modal function:');
console.log(content.slice(start, pos));