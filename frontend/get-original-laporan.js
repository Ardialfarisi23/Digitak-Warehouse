const fs = require('fs');
const { execSync } = require('child_process');

try {
  const original = execSync('git show HEAD:frontend/app/dashboard/reports/page.tsx', { cwd: 'D:\\Project\\digitak-warehouse', encoding: 'utf8' });
  const lines = original.split('\n');
  
  // Find LaporanAuditPage
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export default function LaporanAuditPage')) {
      startLine = i;
      break;
    }
  }
  
  if (startLine !== -1) {
    console.log('LaporanAuditPage starts at line', startLine + 1);
    // Print from there to end
    for (let i = startLine; i < lines.length; i++) {
      console.log(i+1 + ': ' + lines[i]);
    }
  }
} catch (e) {
  console.log('Error:', e.message);
}