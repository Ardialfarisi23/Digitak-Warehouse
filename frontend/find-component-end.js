const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the end of TabRiwayatStok component - search for the next function
const nextFuncIdx = content.indexOf('\nfunction ', 44909 + 100);
console.log('Next function at:', nextFuncIdx);

if (nextFuncIdx !== -1) {
  console.log('Content before next function:', content.slice(nextFuncIdx - 200, nextFuncIdx + 100));
}