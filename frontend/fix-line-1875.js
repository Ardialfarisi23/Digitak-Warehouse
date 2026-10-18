const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Fix line 1875: change "                }))" to "                })"
if (lines[1874] === '                }))') {
  lines[1874] = '                })';
  content = lines.join('\n');
  console.log('Fixed line 1875: })) -> })');
} else {
  console.log('Line 1875 is:', JSON.stringify(lines[1874]));
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');