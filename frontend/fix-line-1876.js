const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Fix line 1876: change "              )" to "              ))"
const lines = content.split('\n');
if (lines[1875] === '              )') {
  lines[1875] = '              ))';
  content = lines.join('\n');
  console.log('Fixed ternary closing on line 1876');
} else {
  console.log('Line 1876 is:', JSON.stringify(lines[1875]));
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');