const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

const startIdx = content.indexOf('data.length === 0 ? (', 79663);
const nextBranch = content.indexOf(') : (', startIdx);
console.log('startIdx:', startIdx);
console.log('nextBranch:', nextBranch);
console.log('Distance:', nextBranch - startIdx);
console.log('Content around nextBranch:', JSON.stringify(content.slice(nextBranch - 50, nextBranch + 50)));