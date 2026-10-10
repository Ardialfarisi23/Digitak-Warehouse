const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const idx = content.indexOf('export default function');
console.log('Context:', JSON.stringify(content.slice(idx, idx + 200)));