const fs = require('fs');
let content = fs.readFileSync('app/dashboard/reports/page.tsx', 'utf8');

// Find all "return (" in TabRiwayatInputMitra
const mitraStart = content.indexOf('function TabRiwayatInputMitra({ get }: { get: (url: string) => Promise<Response> }) {');
const mitraEnd = content.indexOf('\nexport default function LaporanAuditPage() {');

const mitraContent = content.slice(mitraStart, mitraEnd);
const returnMatches = [];
let pos = 0;
while ((pos = mitraContent.indexOf('return (', pos)) !== -1) {
  returnMatches.push(pos);
  pos += 8;
}

console.log('Return statements at positions:', returnMatches.map(p => p + mitraStart));

// Show context around each
for (const p of returnMatches) {
  console.log('---');
  console.log(mitraContent.slice(Math.max(0, p - 50), p + 100));
}