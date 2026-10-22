const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Load workbook
const workbook = XLSX.readFile('D:\\Project\\digitak-warehouse\\data import.xlsx');
const ws = workbook.Sheets['Rekap BoQ Periode 2026'];
const range = XLSX.utils.decode_range(ws['!ref']);
const maxRow = range.e.r + 1;
const maxCol = range.e.c + 1;

const getCell = (row, col) => {
  const addr = XLSX.utils.encode_cell({r: row - 1, c: col - 1});
  const cell = ws[addr];
  return cell ? cell.v : undefined;
};

const normalizeStr = (val) => {
  if (val === undefined || val === null) return '';
  return String(val).trim().replace(/[\r\n]+/g, ' ');
};

const normalizeMaterialCode = (code) => {
  const normalized = normalizeStr(code);
  // Remove brackets if present, but keep for matching
  return normalized;
};

const normalizeSatuan = (satuan) => {
  const s = normalizeStr(satuan).toLowerCase();
  if (s === 'batang') return 'batang';
  if (s === 'pcs' || s === 'pcs.' || s === 'pc') return 'pcs';
  if (s === 'unit' || s === 'units') return 'unit';
  if (s === 'meter' || s === 'mtr' || s === 'm') return 'meter';
  if (s.includes('rol') || s.includes('roll')) return 'roll';
  if (s === 'box' || s === 'boxes') return 'box';
  return s; // fallback
};

const parseNumber = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

// ===== EXTRACT CLUSTER METADATA (Rows 2-5) =====
const clusterBlocks = [
  { name: 'RW01', startCol: 10, endCol: 14 },
  { name: 'RW02', startCol: 15, endCol: 19 },
  { name: 'RW03', startCol: 20, endCol: 24 },
  { name: 'RW04', startCol: 25, endCol: 29 },
  { name: 'RW05', startCol: 30, endCol: 34 },
  { name: 'RW06', startCol: 35, endCol: 39 },
  { name: 'RW07', startCol: 40, endCol: 44 },
  { name: 'RW09', startCol: 45, endCol: 49 },
  { name: 'RW10', startCol: 50, endCol: 54 },
  { name: 'RW11', startCol: 55, endCol: 59 },
  { name: 'RW14', startCol: 60, endCol: 64 },
  { name: 'RW15', startCol: 65, endCol: 69 },
  { name: 'POP', startCol: 70, endCol: 74 },
];

const clusters = [];
for (const block of clusterBlocks) {
  // Find first non-empty cluster_id in the 5-col block (row 2)
  let clusterId = null;
  for (let c = block.startCol; c <= block.endCol; c++) {
    const val = getCell(2, c);
    if (val !== undefined && String(val).trim() !== '') {
      clusterId = normalizeStr(val);
      break;
    }
  }
  
  // Project name (row 3)
  let projectName = null;
  for (let c = block.startCol; c <= block.endCol; c++) {
    const val = getCell(3, c);
    if (val !== undefined && String(val).trim() !== '') {
      projectName = normalizeStr(val);
      break;
    }
  }
  
  // Homepass plan (row 4)
  let homepassPlan = null;
  for (let c = block.startCol; c <= block.endCol; c++) {
    const val = getCell(4, c);
    if (val !== undefined && String(val).trim() !== '' && !isNaN(Number(val))) {
      homepassPlan = Number(val);
      break;
    }
  }
  
  // Tiket release (row 5)
  let tiketRelease = null;
  for (let c = block.startCol; c <= block.endCol; c++) {
    const val = getCell(5, c);
    if (val !== undefined && String(val).trim() !== '' && String(val).trim() !== ' ') {
      tiketRelease = normalizeStr(val);
      break;
    }
  }
  
  if (clusterId) {
    clusters.push({
      cluster_id: clusterId,
      nama_cluster: projectName || `Cluster ${clusterId}`,
      homepass_plan: homepassPlan,
      no_tiket_release: tiketRelease,
      project_id: 1, // FTTH Rancamanyar Tahap 1
      block_name: block.name,
      cols: { start: block.startCol, end: block.endCol }
    });
  }
}

console.log('Clusters found:', clusters.length);
clusters.forEach(c => console.log(`  ${c.block_name}: ${c.cluster_id} | ${c.nama_cluster} | HP: ${c.homepass_plan} | Tiket: ${c.no_tiket_release}`));

// ===== EXTRACT MATERIALS (Rows 9-64) =====
const materials = [];
const materialRows = [];
for (let r = 9; r <= 64; r++) {
  const deskripsi = normalizeStr(getCell(r, 2));
  const kode = normalizeMaterialCode(getCell(r, 3));
  const satuan = normalizeStr(getCell(r, 4));
  
  if (deskripsi || kode) {
    const satuanNorm = normalizeSatuan(satuan);
    materials.push({
      kode_perangkat: kode,
      nama_barang: deskripsi,
      satuan_excel: satuan,
      satuan_normalized: satuanNorm,
      row: r
    });
    materialRows.push(r);
  }
}

console.log('\nMaterials found:', materials.length);
materials.slice(0, 5).forEach(m => console.log(`  Row ${m.row}: ${m.kode_perangkat} | ${m.nama_barang} | ${m.satuan_excel} -> ${m.satuan_normalized}`));

// ===== EXTRACT RECORDS (Material x Cluster) =====
const records = [];
const discrepancies = [];

// Total columns (E=5, F=6, G=7, H=8, I=9)
const totalCols = {
  boq_plan: 5,
  additional: 6,
  mos: 7,
  used: 8,
  remains: 9
};

for (const mat of materials) {
  const r = mat.row;
  
  // Get totals for validation
  const totalBoqPlan = parseNumber(getCell(r, totalCols.boq_plan));
  const totalAdditional = parseNumber(getCell(r, totalCols.additional));
  const totalMos = parseNumber(getCell(r, totalCols.mos));
  const totalUsed = parseNumber(getCell(r, totalCols.used));
  const totalRemains = parseNumber(getCell(r, totalCols.remains));
  
  for (const cluster of clusters) {
    const startCol = cluster.cols.start;
    // Columns: [BoQ Plan, Additional, MOS, Used, Remains]
    const boqPlan = parseNumber(getCell(r, startCol));
    const additional = parseNumber(getCell(r, startCol + 1));
    const mos = parseNumber(getCell(r, startCol + 2));
    const used = parseNumber(getCell(r, startCol + 3));
    const remains = parseNumber(getCell(r, startCol + 4));
    
    // Skip if all five metrics are 0
    if (boqPlan === 0 && additional === 0 && mos === 0 && used === 0 && remains === 0) {
      continue;
    }
    
    records.push({
      kode_perangkat: mat.kode_perangkat,
      nama_barang: mat.nama_barang,
      satuan: mat.satuan_normalized,
      cluster_id: cluster.cluster_id,
      cluster_name: cluster.nama_cluster,
      boq_plan: boqPlan,
      additional: additional,
      mos: mos,
      used: used,
      remains: remains
    });
  }
  
  // Validate totals
  let sumBoqPlan = 0, sumAdditional = 0, sumMos = 0, sumUsed = 0;
  for (const cluster of clusters) {
    const startCol = cluster.cols.start;
    sumBoqPlan += parseNumber(getCell(r, startCol));
    sumAdditional += parseNumber(getCell(r, startCol + 1));
    sumMos += parseNumber(getCell(r, startCol + 2));
    sumUsed += parseNumber(getCell(r, startCol + 3));
  }
  
  if (sumBoqPlan !== totalBoqPlan) {
    discrepancies.push({ material: mat.kode_perangkat, field: 'BoQ Plan', excel_total: totalBoqPlan, sum_clusters: sumBoqPlan, diff: totalBoqPlan - sumBoqPlan });
  }
  if (sumAdditional !== totalAdditional) {
    discrepancies.push({ material: mat.kode_perangkat, field: 'Additional', excel_total: totalAdditional, sum_clusters: sumAdditional, diff: totalAdditional - sumAdditional });
  }
  if (sumMos !== totalMos) {
    discrepancies.push({ material: mat.kode_perangkat, field: 'MOS', excel_total: totalMos, sum_clusters: sumMos, diff: totalMos - sumMos });
  }
  if (sumUsed !== totalUsed) {
    discrepancies.push({ material: mat.kode_perangkat, field: 'Used', excel_total: totalUsed, sum_clusters: sumUsed, diff: totalUsed - sumUsed });
  }
}

// ===== PREPARE OUTPUT =====
const output = {
  extracted_at: new Date().toISOString(),
  source_file: 'data import.xlsx',
  sheet: 'Rekap BoQ Periode 2026',
  materials: materials.map(m => ({
    kode_perangkat: m.kode_perangkat,
    nama_barang: m.nama_barang,
    satuan_excel: m.satuan_excel,
    satuan_normalized: m.satuan_normalized
  })),
  clusters: clusters.map(c => ({
    cluster_id: c.cluster_id,
    nama_cluster: c.nama_cluster,
    homepass_plan: c.homepass_plan,
    no_tiket_release: c.no_tiket_release,
    project_id: c.project_id
  })),
  records: records,
  validation: {
    total_materials: materials.length,
    total_clusters: clusters.length,
    total_records: records.length,
    non_zero_records: records.length,
    discrepancies: discrepancies
  }
};

// Write output
const outputDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = path.join(outputDir, 'boq_extract.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log('\n=== EXTRACTION SUMMARY ===');
console.log(`Materials: ${output.validation.total_materials}`);
console.log(`Clusters: ${output.validation.total_clusters}`);
console.log(`Records (material x cluster, non-zero): ${output.validation.total_records}`);
console.log(`Discrepancies found: ${discrepancies.length}`);
if (discrepancies.length > 0) {
  console.log('\nDiscrepancies (Excel total vs Sum of clusters):');
  discrepancies.forEach(d => console.log(`  ${d.material} | ${d.field}: Excel=${d.excel_total}, Sum=${d.sum_clusters}, Diff=${d.diff}`));
}
console.log(`\nOutput written to: ${outputPath}`);

// Satuan mapping summary
const satuanMap = {};
materials.forEach(m => {
  satuanMap[m.satuan_normalized] = (satuanMap[m.satuan_normalized] || 0) + 1;
});
console.log('\nSatuan distribution:');
Object.entries(satuanMap).forEach(([k, v]) => console.log(`  ${k}: ${v} materials`));