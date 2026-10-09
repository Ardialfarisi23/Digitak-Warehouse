const XLSX = require('xlsx');

const workbook = XLSX.readFile('D:\\Project\\digitak-warehouse\\data import.xlsx');
console.log('Sheet names:', workbook.SheetNames);

const ws = workbook.Sheets['Rekap BoQ Periode 2026'];
const range = XLSX.utils.decode_range(ws['!ref']);
console.log('Range:', ws['!ref']);
console.log('Max row:', range.e.r + 1, 'Max col:', range.e.c + 1);

// Helper to get cell value
const getCell = (row, col) => {
  const addr = XLSX.utils.encode_cell({r: row - 1, c: col - 1});
  const cell = ws[addr];
  return cell ? cell.v : undefined;
};

// Row 2 (Cluster IDs)
console.log('Row 2 (Cluster IDs):', Array.from({length: 69}, (_, i) => getCell(2, i + 1)));

// Row 3 (Project Names)
console.log('Row 3 (Project Names):', Array.from({length: 69}, (_, i) => getCell(3, i + 1)));

// Row 4 (Homepass Plan)
console.log('Row 4 (Homepass Plan):', Array.from({length: 69}, (_, i) => getCell(4, i + 1)));

// Row 5 (No. Tiket Release)
console.log('Row 5 (Tiket Release):', Array.from({length: 69}, (_, i) => getCell(5, i + 1)));

// Row 8 (Headers B-D)
console.log('Row 8 (Headers B-D):', [getCell(8, 2), getCell(8, 3), getCell(8, 4)]);

// Row 9 (First material)
console.log('Row 9 (Material B-D):', [getCell(9, 2), getCell(9, 3), getCell(9, 4)]);

// Row 64 (Last material)
console.log('Row 64 (Material B-D):', [getCell(64, 2), getCell(64, 3), getCell(64, 4)]);

// Column headers row 8
console.log('\nColumn headers row 8:');
for (let c = 1; c <= range.e.c + 1; c++) {
  const val = getCell(8, c);
  if (val !== undefined) {
    console.log(`  Col ${c}: ${val}`);
  }
}

// Cluster blocks row 2
console.log('\nCluster blocks (row 2):');
for (let c = 10; c <= 60; c++) {
  const val = getCell(2, c);
  if (val !== undefined) {
    console.log(`  Col ${c}: ${val}`);
  }
}