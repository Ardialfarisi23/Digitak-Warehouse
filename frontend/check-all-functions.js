const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

// Find all function definitions
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function ') && lines[i].includes('{') && !lines[i].includes('//')) {
    console.log(i+1 + ': ' + lines[i].trim());
  }
}