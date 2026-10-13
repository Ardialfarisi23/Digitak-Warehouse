const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Find the Modal opening in TabRiwayatStok
for (let i = 2550; i < 2620; i++) {
  if (lines[i].includes('<Modal')) {
    console.log('Modal at line', i+1, ':', lines[i].trim());
  }
}