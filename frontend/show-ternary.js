const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// The ternary structure is completely broken. Let me find the full ternary.
// It starts with: loading ? (...) : error ? (...) : data.length === 0 ? (...) : (data.map(...))
// But the original has the pagination and modal INSIDE the ternary, which is wrong.

// Find the start of the ternary
const ternaryStart = content.indexOf('loading ? (', 79663);
console.log('Ternary start:', ternaryStart);

if (ternaryStart !== -1) {
  // Show from ternary start to well past the data.map branch
  console.log(content.slice(ternaryStart, ternaryStart + 15000));
}