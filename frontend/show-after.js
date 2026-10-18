const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Show what comes after the broken part
console.log(content.slice(83000, 83200));