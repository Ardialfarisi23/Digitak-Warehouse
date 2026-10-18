const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Find LaporanAuditPage and check its structure
let inLaporan = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export default function LaporanAuditPage')) {
    inLaporan = true;
  }
  if (inLaporan) {
    console.log(i+1 + ': [' + JSON.stringify(lines[i]) + ']');
    if (lines[i].trim() === '}' && i > 2650) {
      break;
    }
  }
}