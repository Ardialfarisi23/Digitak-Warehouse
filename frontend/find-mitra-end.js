const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Search for export default in the whole file
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export default function')) {
    console.log('export default at line', i+1, ':', lines[i]);
    break;
  }
}

// Also find the TabRiwayatInputMitra function end
const mitraStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function TabRiwayatInputMitra')) {
    console.log('TabRiwayatInputMitra at line', i+1);
    // Find its end
    for (let j = i+1; j < lines.length; j++) {
      if (lines[j].trim() === '}' && lines[j-1].trim() === ');') {
        console.log('Function end at line', j+1);
        break;
      }
    }
    break;
  }
}