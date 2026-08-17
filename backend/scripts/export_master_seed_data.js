const fs = require('fs');
const path = require('path');
const rawText = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'pdf_text_extracted.txt'), 'utf8');
const text = rawText.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, '  ').trim();

function section(header) {
  const headers = ['Personil_id', 'gudang_id', 'project_id', 'vehicle_id', 'Product_code'];
  const start = text.indexOf(header);
  if (start === -1) return '';
  const next = headers
    .filter((h) => h !== header)
    .map((h) => ({ h, idx: text.indexOf(h, start + 1) }))
    .filter((item) => item.idx !== -1)
    .sort((a, b) => a.idx - b.idx)[0];
  return text.slice(start, next ? next.idx : text.length).trim();
}

function tokensFor(header) {
  return section(header).split(/  /).map((t) => t.trim()).filter(Boolean);
}

function parsePersonnel() {
  const sectionText = section('Personil_id');
  const rows = [];
  const matches = [...sectionText.matchAll(/P\d{3}[^P\d{3}]*/g)];
  for (const match of matches) {
    const parts = match[0].replace('Personil_id', '').trim().split(/  /).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 8) continue;
    const id = parts[0];
    const name = parts[1];
    const phone = parts[2];
    const nik = parts[3];
    const email = parts[4];
    const position = parts[5];
    const canDrive = parts[6].toLowerCase() === 'ya';
    const isMaterialHandler = parts[7].toLowerCase() === 'ya';
    rows.push({ personnelId: id, name, phone, nik, email, position, canDrive, isMaterialHandler });
  }
  return rows;
}

function parseWarehouses() {
  const sectionText = section('gudang_id');
  const rows = [];
  const entries = sectionText.split(/GDG\d{3}/).map((t) => t.trim()).filter((t) => t && !t.startsWith('gudang_id'));
  const codes = [...sectionText.matchAll(/GDG\d{3}/g)].map((m) => m[0]);
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const tokens = entry.split(/  /).map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 8) continue;
    rows.push({
      code: codes[i],
      name: tokens[0],
      picName: tokens[1],
      phone: tokens[2],
      status: tokens[3],
      address: tokens[4],
      latitude: parseFloat(tokens[5].replace(/,/g, '.')) || null,
      longitude: parseFloat(tokens[6].replace(/,/g, '.')) || null,
      description: tokens[7],
    });
  }
  return rows;
}

function parseProjects() {
  const sectionText = section('project_id');
  const rows = [];
  const entries = sectionText.split(/PRJ\d{3}/).map((t) => t.trim()).filter((t) => t && !t.startsWith('project_id'));
  const ids = [...sectionText.matchAll(/PRJ\d{3}/g)].map((m) => m[0]);
  for (let i = 0; i < entries.length; i++) {
    const tokens = entries[i].split(/  /).map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 7) continue;
    rows.push({
      projectId: ids[i],
      title: tokens[0],
      clusterId: tokens[1],
      projectName: tokens[2],
      kecamatan: tokens[3],
      desaKelurahan: tokens[4],
      kotaKabupaten: tokens[5],
      provinsi: tokens[6],
    });
  }
  return rows;
}

function parseVehicles() {
  const sectionText = section('vehicle_id');
  const rows = [];
  const entries = sectionText.split(/VHC\d{3}/).map((t) => t.trim()).filter((t) => t && !t.startsWith('vehicle_id'));
  const ids = [...sectionText.matchAll(/VHC\d{3}/g)].map((m) => m[0]);
  for (let i = 0; i < entries.length; i++) {
    const tokens = entries[i].split(/  /).map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 4) continue;
    rows.push({
      vehicleId: ids[i],
      type: tokens[0],
      brand: tokens[1],
      plateNumber: tokens[2],
      description: tokens.slice(3).join(' '),
    });
  }
  return rows;
}

function parseItems() {
  const sectionText = section('Product_code');
  const tokens = sectionText.split(/  /).map((t) => t.trim()).filter(Boolean);
  const skipHeaders = new Set(['Product_code', 'Product_name', 'QTY', 'Unit of Material', 'Status', 'Foto Barang']);
  const items = [];
  let i = 0;
  while (i < tokens.length) {
    if (skipHeaders.has(tokens[i])) {
      i += 1;
      continue;
    }
    const code = tokens[i];
    i += 1;
    let name = '';
    while (i < tokens.length && !/^\d+$/.test(tokens[i])) {
      name = (name ? `${name} ` : '') + tokens[i];
      i += 1;
    }
    if (i + 3 >= tokens.length) break;
    const quantity = Number(tokens[i]);
    const unitValue = tokens[i + 1] || '';
    const unitLabel = tokens[i + 2] || '';
    let status = tokens[i + 3] || '';
    let advance = 4;
    if (status === 'Low' && tokens[i + 4] === 'Stock') {
      status = 'Low Stock';
      advance = 5;
    } else if (status === 'Out' && tokens[i + 4] === 'of' && tokens[i + 5] === 'Stock') {
      status = 'Out of Stock';
      advance = 6;
    }
    items.push({ code, name: name.trim(), quantity, unit: `${unitValue} ${unitLabel}`.trim(), status });
    i += advance;
  }
  return items;
}

const output = {
  personnel: parsePersonnel(),
  warehouses: parseWarehouses(),
  projects: parseProjects(),
  vehicles: parseVehicles(),
  items: parseItems(),
};
const outputPath = path.join(__dirname, 'master_seed_output.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`Master data written to ${outputPath}`);
