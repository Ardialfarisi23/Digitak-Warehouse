const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the component return
const searchStr = '  return (\r\n    <div>\r\n      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50';
const idx = content.indexOf(searchStr, 98400);
if (idx !== -1) {
  console.log('Found at:', idx);
  console.log('Context:', JSON.stringify(content.slice(idx, idx + 300)));
} else {
  console.log('Not found with exact string');
  // Try with \n only
  const searchStr2 = '  return (\n    <div>\n      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50';
  const idx2 = content.indexOf(searchStr2, 98400);
  if (idx2 !== -1) {
    console.log('Found with LF at:', idx2);
  } else {
    console.log('Not found with LF either');
  }
}