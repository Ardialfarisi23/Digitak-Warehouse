const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Fix the ternary closing - need )) not )
const broken = `                ))
              )
              )}`;

const fixed = `                ))
              ))
              )}`;

if (content.includes(broken)) {
  content = content.replace(broken, fixed);
  console.log('Fixed ternary closing');
} else {
  console.log('Pattern not found, trying alternative');
  const idx = content.indexOf('                ))\n              )\n              )}');
  if (idx !== -1) {
    console.log('Found at:', idx);
    console.log(content.slice(idx, idx + 100));
  }
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');