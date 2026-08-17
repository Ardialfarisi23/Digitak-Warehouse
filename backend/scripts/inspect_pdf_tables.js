const fs = require('fs');
const text = fs.readFileSync('docs/pdf_text_extracted.txt', 'utf8');
const patterns = [
  'Personil_id',
  'gudang_id',
  'project_id',
  'vehicle_id',
  'Product_code',
];
for (const p of patterns) {
  const idx = text.indexOf(p);
  if (idx === -1) {
    console.log(`${p} not found`);
    continue;
  }
  const snippet = text.slice(idx, idx + 2000);
  console.log('---', p, '---');
  console.log(snippet.replace(/\s+/g, ' ').slice(0, 800));
  console.log('\n');
}
