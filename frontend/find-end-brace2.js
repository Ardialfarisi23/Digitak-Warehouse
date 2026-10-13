const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

const startIdx = content.indexOf('data.length === 0 ? (', 79663);
const nextBranch = content.indexOf(') : (', startIdx);

// Search backwards from nextBranch for the )) that closes the empty state
for (let i = nextBranch - 1; i > startIdx; i--) {
  if (content.slice(i, i+2) === '))' && content.slice(i-2, i) === '\r\n') {
    // Check if followed by the branch
    const after = content.slice(i+2, i+20);
    if (after.trim().startsWith(') : (')) {
      console.log('Found at:', i);
      console.log('Context:', JSON.stringify(content.slice(i-10, i+30)));
      break;
    }
  }
}