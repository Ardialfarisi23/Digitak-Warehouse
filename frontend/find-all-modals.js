const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Find all Modal usages in TabRiwayatStok (lines 1037-2623)
for (let i = 1036; i < 2623; i++) {
  if (lines[i].includes('<Modal')) {
    console.log('Modal at line', i+1, ':', lines[i].trim());
  }
  if (lines[i].includes('</Modal>')) {
    console.log('</Modal> at line', i+1, ':', lines[i].trim());
  }
}