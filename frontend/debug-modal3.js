const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const start = content.indexOf('function Modal({ open, onClose, title, children, className }');

// Find the end by looking for the next function declaration
const nextFunc = content.indexOf('\nfunction ', start + 10);
console.log('Next function at:', nextFunc);
if (nextFunc !== -1) {
  const actual = content.slice(start, nextFunc);
  console.log('Actual content (first 500):', JSON.stringify(actual.slice(0, 500)));
  console.log('Actual content (last 500):', JSON.stringify(actual.slice(-500)));
}