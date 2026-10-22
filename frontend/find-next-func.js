const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the ACTUAL end of the TabRiwayatInputMitra component - should be before the next function
const nextFuncIdx = content.indexOf('\nfunction ', 108069);
if (nextFuncIdx !== -1) {
  console.log('Next function at:', nextFuncIdx);
  console.log('Distance from return:', nextFuncIdx - 108069);
  console.log('Content at end:', content.slice(nextFuncIdx - 100, nextFuncIdx + 100));
}