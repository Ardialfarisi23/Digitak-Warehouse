const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Show content from mitra start to 5000 chars
console.log('Content from mitra start:', JSON.stringify(content.slice(95072, 96000)));