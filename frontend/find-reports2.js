const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
// Find the component definition
const idx = content.indexOf('const Reports = (');
if (idx !== -1) {
  console.log('Found at:', idx);
  console.log('Context:', JSON.stringify(content.slice(idx - 50, idx + 100)));
} else {
  console.log('Not found');
  // Try export default function
  const idx2 = content.indexOf('export default function');
  if (idx2 !== -1) {
    console.log('Found export default function at:', idx2);
  }
}