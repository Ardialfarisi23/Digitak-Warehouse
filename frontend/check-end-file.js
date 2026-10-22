const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

// Find all export default
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export default function')) {
    console.log('export default at line', i+1, ':', lines[i].trim());
  }
}

// Check end of file
for (let i = Math.max(0, lines.length - 20); i < lines.length; i++) {
  console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
}