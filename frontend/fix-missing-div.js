const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Fix the missing closing </div> for the flex flex-wrap div
// It should be before </td> on the line that has just "                        </td>"

const broken = `                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-700">`;

const fixed = `                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700">`;

if (content.includes(broken)) {
  content = content.replace(broken, fixed);
  console.log('Fixed missing closing div');
} else {
  console.log('Pattern not found');
  // Try alternative
  const idx = content.indexOf('                        </td>\n                        <td className="px-6 py-4 whitespace-nowrap text-slate-700">');
  if (idx !== -1) {
    console.log('Found alternative at:', idx);
    console.log(content.slice(idx - 100, idx + 100));
  }
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');