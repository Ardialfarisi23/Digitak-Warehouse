const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the TabRiwayatStok tbody - it's the third one
let tbodyCount = 0;
let pos = 0;
while ((pos = content.indexOf('tbody className="divide-y divide-slate-50"', pos)) !== -1) {
  tbodyCount++;
  console.log(`tbody #${tbodyCount} at: ${pos}`);
  pos += 10;
}

// The third tbody should be TabRiwayatStok
// Let's find content around the third tbody
const thirdTbody = content.indexOf('tbody className="divide-y divide-slate-50"', 
  content.indexOf('tbody className="divide-y divide-slate-50"', 
    content.indexOf('tbody className="divide-y divide-slate-50"') + 1) + 1);

if (thirdTbody !== -1) {
  console.log('Third tbody at:', thirdTbody);
  // Find the empty state in this tbody
  const emptyIdx = content.indexOf('data.length === 0 ? (', thirdTbody);
  console.log('Empty state at:', emptyIdx);
  if (emptyIdx !== -1) {
    // Find the ))
    for (let i = 0; i < 5; i++) {
      const next = content.indexOf('))', emptyIdx + (i * 1000));
      if (next !== -1) {
        console.log(`)) #${i+1} at: ${next}`);
        console.log('Context:', content.slice(next - 100, next + 100));
      }
    }
  }
}