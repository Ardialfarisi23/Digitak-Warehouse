const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Find the duplicate return and remove it, keeping only one proper return
// The duplicate starts at line 2351 (index 2350): "  return ("
// And continues until the end of the function

// First, let's find where the TabRiwayatInputMitra function ends
// It should end before "export default function LaporanAuditPage"
const nextFuncIdx = content.indexOf('\nexport default function LaporanAuditPage() {');
console.log('Next function at:', nextFuncIdx);

// Find the TabRiwayatInputMitra function start
const mitraStart = content.indexOf('function TabRiwayatInputMitra({ get }: { get: (url: string) => Promise<Response> }) {');
console.log('Mitra start at:', mitraStart);

// Find the first return (early returns end around line 2273)
// The desktopTable constant ends at line 2349 (index 2348): "  );"
// Then there's a duplicate return at line 2351 (index 2350)

// We need to replace from line 2351 to the function end with a proper single return
// The proper return should include: filter UI, mobileCards, desktopTable, Modal

// Let's find the exact content to replace
const duplicateReturnStart = content.indexOf('\n  return (\n    <div>\n      {mobileCards}\n      {desktopTable}\n    <div>\n      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-700">', 2350 * 50); // rough position

if (duplicateReturnStart !== -1) {
  console.log('Found duplicate return at:', duplicateReturnStart);
  
  // Find the end of the function (the closing brace before export default)
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let funcEnd = -1;
  
  for (let i = duplicateReturnStart; i < content.length; i++) {
    const c = content[i];
    const prev = content[i-1];
    
    if (!inString && (c === '"' || c === "'" || c === '`')) {
      inString = true;
      stringChar = c;
    } else if (inString && c === stringChar && prev !== '\\') {
      inString = false;
    } else if (!inString) {
      if (c === '{') braceCount++;
      if (c === '}') {
        braceCount--;
        if (braceCount === 0) {
          funcEnd = i;
          break;
        }
      }
    }
  }
  
  console.log('Function end at:', funcEnd);
  
  if (funcEnd !== -1) {
    const oldCode = content.slice(duplicateReturnStart, funcEnd + 1);
    console.log('Old code length:', oldCode.length);
    console.log('Old code start:', oldCode.slice(0, 200));
    console.log('Old code end:', oldCode.slice(-200));
  }
}