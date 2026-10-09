const data = require('./data/boq_extract.json');

const cableCodes = ['CBL-00215', 'CBL-00225', 'CBL-00220', 'CBL-00223', 'CBL-00226', 'CBL-00229', 'CBL-00231'];

console.log('=== KABEL DROPCORE BOQ PLAN TOTALS ===\n');

let grandTotal = 0;

for (const code of cableCodes) {
  const records = data.records.filter(r => r.kode_perangkat === code);
  const total = records.reduce((sum, r) => sum + r.boq_plan, 0);
  const nonZero = records.filter(r => r.boq_plan > 0);
  
  console.log(`${code}:`);
  nonZero.forEach(r => {
    console.log(`  ${r.cluster_name}: ${r.boq_plan}`);
  });
  console.log(`  TOTAL: ${total} (${nonZero.length} clusters)\n`);
  grandTotal += total;
}

console.log(`GRAND TOTAL: ${grandTotal}`);

// Also check the user's claimed total
const userClaimed = 19 + 80 + 323 + 215 + 91 + 28 + 4;
console.log(`User claimed: ${userClaimed}`);
console.log(`Difference: ${grandTotal - userClaimed}`);

// Check per material totals from my earlier analysis
console.log('\n=== FROM ANALYSIS SCRIPT ===');
const analysis = {
  'CBL-00220': 323,
  'CBL-00223': 215,
  'CBL-00226': 91,
  'CBL-00225': 80,
  'CBL-00229': 28,
  'CBL-00215': 19,
  'CBL-00231': 4
};
console.log('Analysis totals:', analysis);
console.log('Sum:', Object.values(analysis).reduce((a,b)=>a+b,0));