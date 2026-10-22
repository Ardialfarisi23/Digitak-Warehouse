const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the duplicate return in the full file
const dupStart = content.indexOf('  return (\n    <div>\n      {mobileCards}\n      {desktopTable}\n    <div>\n      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-700">');

if (dupStart !== -1) {
  console.log('Duplicate return found at:', dupStart);
  
  // Find the next function declaration after dupStart
  const nextFunc = content.indexOf('\nexport default function LaporanAuditPage() {', dupStart);
  console.log('Next function at:', nextFunc);
  
  if (nextFunc !== -1) {
    // Find the closing brace of TabRiwayatInputMitra before nextFunc
    // Search backwards from nextFunc for the function closing
    let found = false;
    for (let i = nextFunc - 1; i > dupStart; i--) {
      if (content[i] === '}' && content[i-1] === '\n' && content[i-2] === '\r') {
        // Check if this is the function closing (not inside JSX)
        // Look at context
        const context = content.slice(i - 50, i + 10);
        if (context.includes(');') && !context.includes('<')) {
          console.log('Function end at:', i);
          console.log('Context:', content.slice(i - 100, i + 10));
          found = true;
          break;
        }
      }
    }
    if (!found) {
      console.log('Could not find function end');
    }
  }
}