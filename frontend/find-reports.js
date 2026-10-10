const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
// Find Reports component
const idx = content.indexOf('function Reports()');
if (idx !== -1) {
  console.log('Found at:', idx);
  console.log('Context:', JSON.stringify(content.slice(idx - 50, idx + 50)));
} else {
  console.log('Not found');
  // Try export default
  const idx2 = content.indexOf('export default');
  if (idx2 !== -1) {
    console.log('Found export default at:', idx2);
  }
}