const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Find which function this is - search backwards for "function "
for (let i = 2622; i >= 0; i--) {
  if (lines[i].includes('function ') && lines[i].includes('{')) {
    console.log('Function at line', i+1, ':', lines[i].trim());
    break;
  }
}