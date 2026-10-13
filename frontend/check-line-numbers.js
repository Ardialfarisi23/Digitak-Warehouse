const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);

// Check what's at line 2623
console.log('Line 2623:', JSON.stringify(lines[2622]));
console.log('Line 2622:', JSON.stringify(lines[2621]));
console.log('Line 2621:', JSON.stringify(lines[2620]));
console.log('Line 2620:', JSON.stringify(lines[2619]));
console.log('Line 2619:', JSON.stringify(lines[2618]));