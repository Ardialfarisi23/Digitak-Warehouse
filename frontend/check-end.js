const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Look at the end of the file to understand structure
console.log('File length:', content.length);
console.log('Last 500 chars:', JSON.stringify(content.slice(-500)));