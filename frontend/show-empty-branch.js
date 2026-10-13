const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

const startIdx = content.indexOf('data.length === 0 ? (', 79663);
const nextBranch = content.indexOf(') : (', startIdx);

console.log('Empty state branch content:');
console.log(content.slice(startIdx, nextBranch));