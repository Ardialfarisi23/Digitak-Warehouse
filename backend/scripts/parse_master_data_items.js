const fs = require('fs');
const path = require('path');
const text = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'pdf_text_extracted.txt'), 'utf8');
const clean = text.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, '  ').trim();

function section(header) {
  const i = clean.indexOf(header);
  if (i === -1) return '';
  const headers = ['Personil_id', 'gudang_id', 'project_id', 'vehicle_id', 'Product_code'];
  const next = headers.find(h => h !== header && clean.indexOf(h, i + 1) !== -1 && clean.indexOf(h, i + 1) > i);
  const end = next ? clean.indexOf(next, i + 1) : clean.length;
  return clean.slice(i, end).trim();
}

const itemSection = section('Product_code');
const tokens = itemSection.split(/  /).map(t => t.trim()).filter(Boolean);
console.log('tokens length', tokens.length);
console.log('first 30', tokens.slice(0, 30));

let i = 0;
const items = [];
while (i < tokens.length) {
  const token = tokens[i];
  if (['Product_code', 'Product_name', 'QTY', 'Unit of Material', 'Status', 'Foto Barang'].includes(token)) {
    i += 1;
    continue;
  }
  const code = token;
  let name = '';
  i += 1;
  while (i < tokens.length && !/^(?:\[?[A-Z0-9\-]+\]?)$/.test(tokens[i])) {
    if (/^\d+$/.test(tokens[i]) && i + 2 < tokens.length && /^\d+$/.test(tokens[i + 1]) && /^[A-Za-z]+$/.test(tokens[i + 2])) break;
    name += (name ? ' ' : '') + tokens[i];
    i += 1;
  }
  const qty = Number(tokens[i]);
  const unit = tokens[i + 1];
  const unit2 = tokens[i + 2];
  let status = tokens[i + 3] || '';
  if (status === 'Low' && tokens[i + 4] === 'Stock') {
    status = 'Low Stock';
    i += 5;
  } else if (status === 'Out' && tokens[i + 4] === 'of' && tokens[i + 5] === 'Stock') {
    status = 'Out of Stock';
    i += 6;
  } else {
    i += 4;
  }
  items.push({ code, name: name.trim(), quantity: qty, unit: `${unit} ${unit2}`.trim(), status });
}
console.log('items', items.length);
console.log(items.slice(0, 10));
console.log(items.slice(-10));
