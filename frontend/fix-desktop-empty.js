const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find the exact broken empty state in desktop table
const startIdx = content.indexOf('data.length === 0 ? (', 79663);
if (startIdx !== -1) {
  // Find the end of this ternary branch - look for the next branch or closing
  const nextBranch = content.indexOf(') : (', startIdx);
  if (nextBranch !== -1) {
    const brokenSection = content.slice(startIdx, nextBranch);
    console.log('Broken section length:', brokenSection.length);
    console.log('Broken section:', brokenSection);
    
    const fixedSection = `data.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={13}>
                    Tidak ada pergerakan stok yang cocok dengan filter ini.
                  </td>
                </tr>
              ) : (`;
    
    content = content.slice(0, startIdx) + fixedSection + content.slice(nextBranch);
    console.log('Fixed broken empty state in desktop table');
  }
}

fs.writeFileSync('app/dashboard/reports/page.tsx', content);
console.log('Done');