const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Show second Modal in TabRiwayatStok (lines 2517-2625)
for (let i = 2516; i < 2625; i++) {
  console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
}