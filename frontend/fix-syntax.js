const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Fix the syntax error: ) : () : (  should be ) : (
const badSyntax = `              ) : () : (`;
const goodSyntax = `              ) : (`;

if (content.includes(badSyntax)) {
  content = content.replace(badSyntax, goodSyntax);
  console.log('Fixed syntax error');
} else {
  console.log('Pattern not found');
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');