const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Fix the corrupted line 2354
const corrupted = `{desktopTable}  return (`;
const fixed = `{desktopTable}`;

if (content.includes(corrupted)) {
  content = content.replace(corrupted, fixed);
  console.log('Fixed corrupted line');
} else {
  console.log('Pattern not found, trying alternative');
  const idx = content.indexOf('{desktopTable}  return (');
  if (idx !== -1) {
    console.log('Found at:', idx);
    console.log(content.slice(idx, idx + 100));
  }
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');