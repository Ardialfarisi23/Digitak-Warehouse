const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// The broken ternary is in TabRiwayatStok - search for it specifically
// It has colSpan={13} and references r.kode_tiket etc. in the empty branch

const idx = content.indexOf('colSpan={13}>\n                    Tidak ada pergerakan stok yang cocok dengan filter ini.');
if (idx !== -1) {
  console.log('Found empty message at:', idx);
  // Now find the start of this ternary branch
  const branchStart = content.lastIndexOf('data.length === 0 ? (', idx);
  console.log('Branch start at:', branchStart);
  // Find the end of this branch
  const branchEnd = content.indexOf('))', idx);
  console.log('Branch end at:', branchEnd);
  console.log('Branch content length:', branchEnd - branchStart);
  console.log('First 200:', content.slice(branchStart, branchStart + 200));
  console.log('Last 200:', content.slice(branchEnd - 200, branchEnd + 2));
}