const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Find where the function ends (look for the closing brace before export default)
for (let i = 2450; i < Math.min(2550, lines.length); i++) {
  if (lines[i].trim() === '}' && lines[i-1].trim() === ');') {
    console.log('Function end at line', i+1, ':', lines[i]);
    console.log('Previous line:', lines[i-1]);
    console.log('Context:', lines.slice(i-5, i+5).map((l, idx) => (i-5+idx+1) + ': [' + JSON.stringify(l) + ']'));
    break;
  }
}