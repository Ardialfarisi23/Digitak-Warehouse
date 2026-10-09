// backend/scripts/import-boq/parse-excel.js
// Parse Excel file dan hasilkan struktur data terstruktur

const ExcelJS = require('exceljs');
const config = require('./config');

function normalizeNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object' && val.result !== undefined) return val.result;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '—' || trimmed === ' ') return null;
    const num = Number(trimmed.replace(/,/g, '').replace(/\s+/g, ''));
    return isNaN(num) ? null : num;
  }
  if (typeof val === 'number') return isNaN(val) ? null : val;
  return null;
}

function normalizeMaterialCode(val) {
  if (!val) return null;
  let str = String(val).trim();
  // Handle "In MSP" or similar non-codes
  if (str.toLowerCase().includes('in msp') || str.toLowerCase().includes('in-house')) {
    return null;
  }
  // Fix missing closing bracket
  if (str.startsWith('[') && !str.endsWith(']')) {
    str = str + ']';
  }
  // Keep brackets, remove only spaces and dots
  return str.replace(/[\s.]/g, '');
}

function normalizeClusterName(name) {
  if (!name) return null;
  let result = String(name).trim();
  for (const fix of config.CLUSTER_NAME_FIXES) {
    result = result.replace(fix.from, fix.to);
  }
  return result;
}

function getCellValue(sheet, row, col) {
  const cell = sheet.getCell(row, col);
  return cell.master ? cell.master.value : cell.value;
}

async function parseExcel(filePath = config.EXCEL_FILE) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(config.SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet "${config.SHEET_NAME}" tidak ditemukan`);
  }

  const warnings = [];
  const blockers = [];

  // 1. Baca project title dari B2
  const projectTitleCell = config.LAYOUT.projectTitleCell;
  const projectTitle = getCellValue(sheet, projectTitleCell.row, projectTitleCell.col);
  
  let projectName = config.DEFAULT_PROJECT_NAME;
  if (projectTitle && typeof projectTitle === 'string') {
    // Extract "FTTH-OPEN-AREA RANCAMANYAR" from the full title
    const match = projectTitle.match(/FTTH-OPEN-AREA RANCAMANYAR/i);
    if (match) {
      projectName = match[0].toUpperCase();
      console.log('[DEBUG] Extracted project name:', projectName);
    } else {
      warnings.push(`Project title format tidak dikenali: "${projectTitle}", gunakan default`);
      console.log('[DEBUG] No match for project title, using default');
    }
  } else {
    warnings.push(`Project title kosong di ${projectTitleCell.row}:${projectTitleCell.col}, gunakan default: ${config.DEFAULT_PROJECT_NAME}`);
    console.log('[DEBUG] Project title empty, using default');
  }

  // 2. Deteksi cluster dari row 2 (master cells yang punya cluster ID)
  const clusterRegex = /^(NET|MF)-[A-Z]-\d+$/i;
  const clusters = [];
  const seenClusterIds = new Set();
  
  // Scan row 2 for cluster IDs
  for (let col = config.LAYOUT.firstClusterCol; col <= 74; col++) {
    const val = getCellValue(sheet, config.LAYOUT.clusterIdRow, col);
    if (val && clusterRegex.test(String(val).trim())) {
      const clusterId = String(val).trim().toUpperCase();
      if (seenClusterIds.has(clusterId)) continue;
      seenClusterIds.add(clusterId);

      // Apply override if exists
      const finalClusterId = config.CLUSTER_ID_OVERRIDES[clusterId] || clusterId;
      if (finalClusterId !== clusterId) {
        warnings.push(`Cluster ID override: ${clusterId} -> ${finalClusterId}`);
      }

      // Get cluster name from row 3 (same column)
      const nameVal = getCellValue(sheet, config.LAYOUT.clusterNameRow, col);
      const name = nameVal ? String(nameVal).trim() : '';

      // Get homepass from row 4
      const hpVal = getCellValue(sheet, config.LAYOUT.homepassRow, col);
      const homepass = normalizeNumber(hpVal);

      // Get ticket from row 5
      const ticketVal = getCellValue(sheet, config.LAYOUT.ticketRow, col);
      const ticket = ticketVal && String(ticketVal).trim() !== ' ' ? String(ticketVal).trim() : null;

      // Determine column mapping for this cluster (5 cols: BoQ Plan, Additional, MOS, Used, Remains)
      const startCol = col;
      const colMap = {
        boq: startCol,
        add: startCol + 1,
        mos: startCol + 2,
        used: startCol + 3,
        rem: startCol + 4,
      };

      // Special case: NET-H-004410 at col 68 (BP) only has 1 col
      const skipBoq = clusterId === 'NET-H-004410' && config.NET_H_004410_SKIP_BOQ;
      if (clusterId === 'NET-H-004410') {
        colMap.add = null;
        colMap.mos = null;
        colMap.used = null;
        colMap.rem = null;
      }

      clusters.push({
        index: clusters.length + 1,
        cluster_id: finalClusterId,
        original_cluster_id: clusterId,
        nama_cluster: normalizeClusterName(name),
        homepass_plan: homepass,
        no_tiket_release: ticket,
        colMap,
        startCol,
        skip_boq: skipBoq,
        items: [],
      });
    }
  }

  // Validate cluster count
  if (clusters.length !== config.EXPECTED.clusters) {
    blockers.push(`Cluster terdeteksi: ${clusters.length}, diharapkan: ${config.EXPECTED.clusters}`);
  }

  // 3. Baca material rows (9-64)
  const materialCodes = new Set();
  
  for (let row = config.LAYOUT.dataStartRow; row <= config.LAYOUT.dataEndRow; row++) {
    const desc = getCellValue(sheet, row, config.LAYOUT.materialDescCol);
    const rawCode = getCellValue(sheet, row, config.LAYOUT.materialCodeCol);
    const unit = getCellValue(sheet, row, config.LAYOUT.materialUnitCol);

    const materialCode = normalizeMaterialCode(rawCode);
    const materialName = desc ? String(desc).trim() : null;
    const unitStr = unit ? String(unit).trim() : null;

    // Skip jika material code dan name kosong
    if (!materialCode && !materialName) continue;

    // Skip "In MSP" - not a real material code
    if (materialCode === 'InMSP' || (materialName && materialName.toLowerCase().includes('in-house msp'))) {
      warnings.push(`Row ${row}: Skipping non-material "${materialCode}" (${materialName})`);
      continue;
    }

    if (materialCode) {
      materialCodes.add(materialCode);
    }

    // Baca per cluster
    for (const cluster of clusters) {
      // Skip items for NET-H-004410 (no BOQ, only cluster)
      if (cluster.skip_boq) continue;

      const boqPlan = cluster.colMap.boq ? normalizeNumber(getCellValue(sheet, row, cluster.colMap.boq)) : null;
      const additional = cluster.colMap.add ? normalizeNumber(getCellValue(sheet, row, cluster.colMap.add)) : null;
      const mos = cluster.colMap.mos ? normalizeNumber(getCellValue(sheet, row, cluster.colMap.mos)) : null;
      const used = cluster.colMap.used ? normalizeNumber(getCellValue(sheet, row, cluster.colMap.used)) : null;
      const remains = cluster.colMap.rem ? normalizeNumber(getCellValue(sheet, row, cluster.colMap.rem)) : null;

      // Skip jika semua angka NULL (baris material kosong untuk cluster ini)
      if (boqPlan === null && additional === null && mos === null && used === null) {
        continue;
      }

      // Hitung remains untuk verifikasi: MOS - Additional - BoQ Plan
      const calcRemains = (mos || 0) - (additional || 0) - (boqPlan || 0);

      cluster.items.push({
        row,
        material_code: materialCode,
        material_name: materialName,
        unit: unitStr,
        boq_plan: boqPlan,
        additional,
        mos,
        used,
        remains_excel: remains,
        remains_calc: calcRemains,
        remains_match: remains !== null && Math.abs(remains - calcRemains) < 0.01,
      });
    }
  }

  // 4. Validasi: cek cluster dengan 0 items
  for (const cluster of clusters) {
    if (cluster.items.length === 0) {
      warnings.push(`Cluster ${cluster.cluster_id} (${cluster.nama_cluster}): 0 material rows`);
    }
  }

  // 5. Validasi jumlah material unik (warning only, not blocker)
  if (config.EXPECTED.materials && materialCodes.size !== config.EXPECTED.materials) {
    warnings.push(`Material unik terbaca: ${materialCodes.size}, diharapkan: ${config.EXPECTED.materials}`);
  }

  return {
    project: {
      ...config.PROJECT,
      nama_project: projectName,
    },
    clusters,
    warnings,
    blockers,
    meta: {
      total_clusters: clusters.length,
      total_items: clusters.reduce((sum, c) => sum + c.items.length, 0),
      unique_materials: materialCodes.size,
      parsed_at: new Date().toISOString(),
    },
  };
}

module.exports = { parseExcel, normalizeNumber, normalizeMaterialCode, normalizeClusterName };