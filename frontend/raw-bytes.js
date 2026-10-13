const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

const nextBranch = content.indexOf(') : (', 80243);
console.log('Raw bytes around nextBranch:');
for (let i = nextBranch - 30; i < nextBranch + 30; i++) {
  const c = content[i];
  if (c === '\r') process.stdout.write('\\r');
  else if (c === '\n') process.stdout.write('\\n');
  else if (c === '\t') process.stdout.write('\\t');
  else process.stdout.write(c);
}
console.log('');