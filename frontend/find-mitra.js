const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Search for TabRiwayatInputMitra
const idx = content.indexOf('TabRiwayatInputMitra');
if (idx !== -1) {
  console.log('Found at:', idx);
  console.log('Context:', JSON.stringify(content.slice(idx - 50, idx + 200)));
} else {
  console.log('Not found');
}