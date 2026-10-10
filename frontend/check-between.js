const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Show content from function start to return
console.log('Length from start to return:', 108069 - 95072);
console.log('Content sample:', content.slice(95072, 95500));