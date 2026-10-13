const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Search for export default
for (let i = 2400; i < Math.min(2600, lines.length); i++) {
  if (lines[i].includes('export default function')) {
    console.log('export default at line', i+1, ':', lines[i]);
    // Show context before
    for (let j = i-10; j < i+5; j++) {
      console.log(j+1 + ': [' + JSON.stringify(lines[j]) + ']');
    }
    break;
  }
}