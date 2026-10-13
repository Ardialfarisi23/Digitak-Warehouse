const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Fix line 1884: "                }))" -> "                })"
// Fix line 1885: "              ))" -> "              )"
if (lines[1883] === '                }))') {
  lines[1883] = '                })';
  console.log('Fixed line 1884: })) -> })');
}
if (lines[1884] === '              ))\r') {
  lines[1884] = '              )\r';
  console.log('Fixed line 1885: )) -> )');
}

content = lines.join('\n');
fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');