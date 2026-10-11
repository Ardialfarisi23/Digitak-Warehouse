const fs = require('fs');
const { execSync } = require('child_process');

try {
  const original = execSync('git show HEAD:frontend/app/dashboard/reports/page.tsx', { cwd: 'D:\\Project\\digitak-warehouse', encoding: 'utf8' });
  const lines = original.split('\n');
  for (let i = 1795; i < Math.min(1870, lines.length); i++) {
    console.log(i+1 + ': ' + lines[i]);
  }
} catch (e) {
  console.log('Error:', e.message);
}