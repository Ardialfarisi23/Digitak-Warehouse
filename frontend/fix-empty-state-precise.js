const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the exact start and end of the broken empty state
const startIdx = content.indexOf('data.length === 0 ? (', 79663);
if (startIdx !== -1) {
  // Find the "))" that closes the empty state branch (before " : (")
  const nextBranch = content.indexOf(') : (', startIdx);
  if (nextBranch !== -1) {
    // But we need to find the correct closing - there are nested ))
    // Let's find the pattern: ))\n              ) : (
    const pattern = '))';
    let searchPos = startIdx;
    let found = false;
    for (let i = startIdx; i < nextBranch; i++) {
      if (content.slice(i, i+3) === '))\n') {
        // Check if this is followed by "              ) : ("
        if (content.slice(i+3, i+17) === '              ) : (') {
          const brokenSection = content.slice(startIdx, i+2);
          console.log('Found broken section ending at:', i+2);
          
          const fixedSection = `data.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={13}>
                    Tidak ada pergerakan stok yang cocok dengan filter ini.
                  </td>
                </tr>
              ) : (`;
          
          content = content.slice(0, startIdx) + fixedSection + content.slice(i+2);
          console.log('Fixed broken empty state');
          found = true;
          break;
        }
      }
    }
    if (!found) {
      console.log('Could not find proper end');
    }
  }
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');