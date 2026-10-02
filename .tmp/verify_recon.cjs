const reconciliationRepository = require('D:/Project/digitak-warehouse/backend/src/modules/reconciliation/reconciliation.repository');

async function verify() {
  try {
    const result = await reconciliationRepository.getInventory({ projectId: 'all', warehouseId: 'all', status: 'all' }, null);
    const rows = result.data || [];
    console.log(`Total rows: ${rows.length}`);

    const row1 = rows.find(r => r.project_id === '7' && r.barang_id === '1');
    const row2 = rows.find(r => r.project_id === '7' && r.barang_id === '46');

    console.log(`\nRow project_id=7 barang_id=1:`);
    console.log(JSON.stringify(row1, null, 2));

    console.log(`\nRow project_id=7 barang_id=46:`);
    console.log(JSON.stringify(row2, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

verify();
