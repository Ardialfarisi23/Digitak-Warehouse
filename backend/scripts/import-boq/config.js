// backend/scripts/import-boq/config.js
// Konfigurasi import BOQ dari Excel

const path = require('path');

module.exports = {
  // File & sheet
  EXCEL_FILE: process.env.IMPORT_FILE || path.resolve(__dirname, '..', '..', '..', 'data import.xlsx'),
  SHEET_NAME: 'Rekap BoQ Periode 2026',

  // Output
  OUTPUT_DIR: path.resolve(__dirname, '..', 'output'),
  REPORT_FILE: 'import-report.md',
  MANIFEST_FILE: 'import-manifest.json',

  // Project constants (isi sesuai keputusan)
  PROJECT: {
    nama_project: 'FTTH-OPEN-AREA RANCAMANYAR',  // dari Excel row B2 setelah parsing
    title: 'FTTH-OPEN-AREA RANCAMANYAR',
    area: 'Rancamanyar',
    kota_kabupaten: 'Kabupaten Bandung',
    kecamatan: 'Baleendah',
    desa_kelurahan: 'Rancamanyar',
    provinsi: 'Jawa Barat',
    klien: null,
    status_aktif: true,
  },

  // Fallback project name jika tidak terbaca dari Excel
  DEFAULT_PROJECT_NAME: 'FTTH-OPEN-AREA RANCAMANYAR',

  // Normalisasi nama cluster
  CLUSTER_NAME_FIXES: [
    { from: /Arean/gi, to: 'Area' },
    { from: /OPEN/gi, to: 'Open' },
    { from: /\s+/g, to: ' ' },
    { from: /^\s+|\s+$/g, to: '' },
  ],

  // User import
  DEFAULT_USER_ID: 1,

  // Layout positions (ditemukan dari analisis)
  LAYOUT: {
    // Project title di B2 (merged G2:H2 berisi "Cluster ID", jadi B2 adalah judul)
    projectTitleCell: { row: 2, col: 2 },

    // Cluster ID di row 2, mulai col 10 (J), tiap cluster 5 kolom merged
    // Master cells: J(10), O(15), T(20), Y(25), AD(30), AI(35), AN(40), AS(45), AX(50), BC(55), BH(60), BP(68), BR(70)
    clusterIdRow: 2,
    clusterNameRow: 3,
    homepassRow: 4,
    ticketRow: 5,
    headerRow: 8,        // sub-headers: BoQ Plan, Additional, MOS, Used, Remains
    dataStartRow: 9,
    dataEndRow: 64,      // last row with material code

    // Material columns
    materialDescCol: 2,     // B
    materialCodeCol: 3,     // C
    materialUnitCol: 4,     // D

    // Summary columns (E-I = 5-9)
    summaryStartCol: 5,
    summaryEndCol: 9,

    // Cluster blocks start at col 10 (J), 5 cols each
    firstClusterCol: 10,
    colsPerCluster: 5,
  },

  // Expected counts for validation
  EXPECTED: {
    clusters: 13,
    // materials: 49,  // actual unique materials in Excel is 55; don't block on count mismatch
  },

  // Blocking rules
  REQUIRED_FIELDS: {
    project: ['nama_project', 'kota_kabupaten', 'kecamatan'],
    cluster: ['cluster_id', 'nama_cluster', 'project_id'],
    boq: ['cluster_id', 'boq_number'],
    boq_item: ['boq_id', 'barang_id', 'qty_rencana'],
  },

  // Cluster ID overrides (koreksi typo, default kosong)
  CLUSTER_ID_OVERRIDES: {
    'NET-H-004938': 'NET-H-004398',
  },

  // Material code overrides (e.g., "In MSP" -> "In MSP")
  CODE_OVERRIDES: {
    'In MSP': 'In MSP',
  },

  // Special handling for NET-H-004410 (incomplete cluster)
  NET_H_004410_SKIP_BOQ: true,
};