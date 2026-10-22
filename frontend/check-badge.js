const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Show context around 2348
console.log('Context:', content.slice(2300, 2400));