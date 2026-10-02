const AppError = require('../src/shared/errors');

async function testAuthorization() {
  console.log('=== TEST AUTHORIZATION ===');

  const warehouseService = require('../src/modules/warehouse/warehouse.service');

  const testCases = [
    { role: 'admin_general', tipe: 'dadakan', expect: 'success', desc: 'admin create dadakan' },
    { role: 'supervisor', tipe: 'dadakan', expect: 'error', desc: 'supervisor create dadakan' },
    { role: 'staf_gudang', tipe: 'dadakan', expect: 'error', desc: 'staf_gudang create dadakan' },
  ];

  for (const tc of testCases) {
    try {
      await warehouseService.create({ nama_gudang: 'Test Dadakan', tipe: tc.tipe }, 1, tc.role);
      console.log(`${tc.desc}: ${tc.expect === 'success' ? 'PASS' : 'FAIL (should error)'}`);
    } catch (err) {
      if (tc.expect === 'error') {
        console.log(`${tc.desc}: PASS (${err.message})`);
      } else {
        console.log(`${tc.desc}: FAIL (unexpected error: ${err.message})`);
      }
    }
  }
}

testAuthorization().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
