const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the return statement
const returnIdx = content.indexOf('  return (\r\n    <div>\r\n      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50', 95072);
if (returnIdx !== -1) {
  console.log('Return at:', returnIdx);
  console.log('Content:', content.slice(returnIdx, returnIdx + 500));
}