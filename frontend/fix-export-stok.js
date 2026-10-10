const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Check Export Riwayat Stok button
const exportStokIdx = content.indexOf('onClick={handleExportRiwayatStok}');
if (exportStokIdx !== -1) {
  const buttonStart = content.lastIndexOf('<button', exportStokIdx);
  const buttonEnd = content.indexOf('>', buttonStart);
  const buttonTag = content.slice(buttonStart, buttonEnd + 1);
  console.log('Button tag:', JSON.stringify(buttonTag));
  
  // Try to add aria-label
  if (!buttonTag.includes('aria-label')) {
    // Find what to replace
    if (buttonTag.includes('className="')) {
      const newButtonTag = buttonTag.replace('className="', 'aria-label="Ekspor Riwayat Stok" className="');
      content = content.slice(0, buttonStart) + newButtonTag + content.slice(buttonEnd + 1);
      console.log('Added aria-label');
    } else {
      console.log('No className found in button');
    }
  } else {
    console.log('Already has aria-label');
  }
} else {
  console.log('Export button not found');
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');