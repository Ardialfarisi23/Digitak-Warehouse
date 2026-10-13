const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the duplicate return - search for the specific pattern
const searchStr = '{mobileCards}\n      {desktopTable}\n    <div>\n      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-700">';
const idx = content.indexOf(searchStr);

if (idx !== -1) {
  console.log('Found at:', idx);
  // Find the "return (" before this
  const returnIdx = content.lastIndexOf('return (', idx);
  console.log('Return at:', returnIdx);
  console.log('Context:', content.slice(returnIdx, returnIdx + 200));
  
  // Find the next function
  const nextFunc = content.indexOf('\nexport default function LaporanAuditPage() {', idx);
  console.log('Next function at:', nextFunc);
  
  // Find the function closing brace by searching backwards from nextFunc
  for (let i = nextFunc - 1; i > idx; i--) {
    if (content[i] === '}' && content[i-1] === '\n' && content[i-2] === '\r') {
      const context = content.slice(i - 80, i + 10);
      if (context.includes(');') && !context.includes('<div>')) {
        console.log('Function end at:', i);
        console.log('Context:', context);
        break;
      }
    }
  }
} else {
  console.log('Pattern not found');
}