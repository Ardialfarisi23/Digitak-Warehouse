const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');
const lines = content.split('\n');

// Fix line 1885: "              )" -> remove (extra closing paren)
// Fix line 1886: "              )}" -> "              )}" (keep as is, this closes the ternary branch and JSX)
// Actually, looking at TabAuditLog pattern:
//   line 741: "                })"
//   line 742: "              )}"
// We need:
//   line 1884: "                })" (already fixed)
//   line 1885: "              )}" (combines the ternary close and JSX close)

if (lines[1884] === '              )\r') {
  lines[1884] = '              )}\r';
  console.log('Fixed line 1885: ) -> )}');
}
// Remove the old line 1886 which is now duplicate
if (lines[1885] === '              )}\r') {
  lines.splice(1885, 1);
  console.log('Removed duplicate line 1886');
}

content = lines.join('\n');
fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');