const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Search for the exact string
const search = 'Tidak ada pergerakan stok yang cocok dengan filter ini.';
const idx = content.indexOf(search);
if (idx !== -1) {
  console.log('Found at:', idx);
  // Find the data.length === 0 before this
  const branchStart = content.lastIndexOf('data.length === 0 ? (', idx);
  console.log('Branch start at:', branchStart);
  // Find the )) after this
  let searchPos = idx;
  for (let i = 0; i < 10; i++) {
    const next = content.indexOf('))', searchPos);
    if (next !== -1) {
      console.log('Found )) at:', next);
      console.log('Context:', content.slice(next - 50, next + 50));
      searchPos = next + 2;
    }
  }
}