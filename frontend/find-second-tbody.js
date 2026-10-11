const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the second tbody (TabRiwayatStok)
const firstTbody = content.indexOf('tbody className="divide-y divide-slate-50"');
const secondTbody = content.indexOf('tbody className="divide-y divide-slate-50"', firstTbody + 1);
if (secondTbody !== -1) {
  console.log('Second tbody at:', secondTbody);
  console.log(content.slice(secondTbody, secondTbody + 3000));
}