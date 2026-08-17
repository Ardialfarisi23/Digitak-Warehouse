const fs = require('fs');
const path = require('path');
const text = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'pdf_text_extracted.txt'), 'utf8');
const cleaned = text.replace(/\r\n?/g, ' ').replace(/\s{2,}/g, '  ').trim();

function splitSection(header) {
  const idx = cleaned.indexOf(header);
  if (idx === -1) return null;
  const nextHeaders = ['Personil_id', 'gudang_id', 'project_id', 'vehicle_id', 'Product_code'];
  const next = nextHeaders.find(h => cleaned.indexOf(h, idx + header.length) !== -1 && cleaned.indexOf(h, idx + header.length) > idx);
  const end = next ? cleaned.indexOf(next, idx + header.length) : cleaned.length;
  return cleaned.slice(idx, end).trim();
}

function tokenize(section) {
  return section.split(/  /).map((v) => v.trim()).filter(Boolean);
}

const personnelSection = splitSection('Personil_id');
const warehouseSection = splitSection('gudang_id');
const projectSection = splitSection('project_id');
const vehicleSection = splitSection('vehicle_id');
const itemSection = splitSection('Product_code');

console.log('personnel section starts', personnelSection?.slice(0, 200));
console.log('warehouse section starts', warehouseSection?.slice(0, 200));
console.log('project section starts', projectSection?.slice(0, 200));
console.log('vehicle section starts', vehicleSection?.slice(0, 200));
console.log('item section starts', itemSection?.slice(0, 200));

function parsePersonnel() {
  const tokens = tokenize(personnelSection).slice(8); // skip headers
  const rows = [];
  for (let i = 0; i < tokens.length; i += 8) {
    const row = tokens.slice(i, i + 8);
    if (row.length < 8) break;
    rows.push({
      personnelId: row[0],
      name: row[1],
      phone: row[2],
      nik: row[3],
      email: row[4],
      position: row[5],
      canDrive: row[6].toLowerCase() === 'ya',
      isMaterialHandler: row[7].toLowerCase() === 'ya',
    });
  }
  return rows;
}

function parseWarehouse() {
  const tokens = tokenize(warehouseSection).slice(9); // skip headers
  const rows = [];
  for (let i = 0; i < tokens.length; i += 9) {
    const row = tokens.slice(i, i + 9);
    if (row.length < 9) break;
    rows.push({
      code: row[0],
      name: row[1],
      picName: row[2],
      phone: row[3],
      status: row[4],
      address: row[5],
      latitude: parseFloat(row[6].replace(/,/g, '.')) || null,
      longitude: parseFloat(row[7].replace(/,/g, '.')) || null,
      description: row[8],
    });
  }
  return rows;
}

function parseProject() {
  const tokens = tokenize(projectSection).slice(8);
  const rows = [];
  for (let i = 0; i < tokens.length; i += 8) {
    const row = tokens.slice(i, i + 8);
    if (row.length < 8) break;
    rows.push({
      projectId: row[0],
      title: row[1],
      clusterId: row[2],
      projectName: row[3],
      kecamatan: row[4],
      desaKelurahan: row[5],
      kotaKabupaten: row[6],
      provinsi: row[7],
    });
  }
  return rows;
}

function parseVehicle() {
  const tokens = tokenize(vehicleSection).slice(6);
  const rows = [];
  for (let i = 0; i < tokens.length; i += 5) {
    const row = tokens.slice(i, i + 5);
    if (row.length < 5) break;
    rows.push({
      vehicleId: row[0],
      type: row[1],
      brand: row[2],
      plateNumber: row[3],
      description: row[4],
    });
  }
  return rows;
}

function parseItems() {
  const tokens = tokenize(itemSection);
  const rows = [];
  const statusWords = new Set(['Available', 'Low', 'Out']);

  let i = 0;
  while (i < tokens.length) {
    const code = tokens[i];
    if (code === 'Product_code' || code === 'Product_name' || code === 'QTY' || code === 'Unit of Material' || code === 'Status' || code === 'Foto Barang') {
      i += 1;
      continue;
    }

    let j = i + 1;
    while (j + 1 < tokens.length && !(Number.isInteger(Number(tokens[j])) && Number.isInteger(Number(tokens[j + 1])))) {
      j += 1;
    }
    if (j + 2 >= tokens.length) break;

    const qtyToken = tokens[j];
    const unitQuantityToken = tokens[j + 1];
    const unitTypeToken = tokens[j + 2];
    let statusToken = tokens[j + 3] || '';
    let statusTokenCount = 1;
    if (statusToken === 'Low' && tokens[j + 4] === 'Stock') {
      statusToken = 'Low Stock';
      statusTokenCount = 2;
    } else if (statusToken === 'Out' && tokens[j + 4] === 'of' && tokens[j + 5] === 'Stock') {
      statusToken = 'Out of Stock';
      statusTokenCount = 3;
    }

    const name = tokens.slice(i + 1, j).join(' ').trim();
    rows.push({
      code,
      name,
      quantity: Number(qtyToken) || 0,
      unit: `${unitQuantityToken} ${unitTypeToken}`.trim(),
      status: statusToken,
    });

    i = j + 3 + statusTokenCount;
  }

  return rows;
}

const personnel = parsePersonnel();
const warehouses = parseWarehouse();
const projects = parseProject();
const vehicles = parseVehicle();
const items = parseItems();

console.log('personnel count', personnel.length);
console.log('warehouses count', warehouses.length);
console.log('projects count', projects.length);
console.log('vehicles count', vehicles.length);
console.log('items count', items.length);
console.log(JSON.stringify({personnel: personnel.slice(0,3), warehouses, projects, vehicles, items: items.slice(0,5)}, null, 2));
