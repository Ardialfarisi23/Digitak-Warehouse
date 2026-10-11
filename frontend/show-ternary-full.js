const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Show the full ternary structure for TabRiwayatStok
console.log(content.slice(80243, 83075));