const { createWarehouseSchema, updateWarehouseSchema } = require('../src/modules/warehouse/warehouse.validation');
const AppError = require('../src/modules/shared/errors');

function testValidation() {
  console.log('=== TEST VALIDASI ===');

  const tetapNoProject = {
    nama_gudang: 'Gudang Baru',
    tipe: 'tetap',
  };
  const result1 = createWarehouseSchema.safeParse(tetapNoProject);
  console.log('tetap tanpa project_id:', result1.success ? 'PASS' : 'FAIL', result1.success ? '' : result1.error.issues.map(i => i.message).join(', '));

  const dadakanNoProject = {
    nama_gudang: 'Gudang Dadakan Baru',
    tipe: 'dadakan',
  };
  const result2 = createWarehouseSchema.safeParse(dadakanNoProject);
  console.log('dadakan tanpa project_id:', result2.success ? 'FAIL (should error)' : 'PASS', !result2.success ? result2.error.issues.map(i => i.message).join(', ') : '');

  const dadakanWithProject = {
    nama_gudang: 'Gudang Dadakan Baru',
    tipe: 'dadakan',
    project_id: 1,
  };
  const result3 = createWarehouseSchema.safeParse(dadakanWithProject);
  console.log('dadakan dengan project_id:', result3.success ? 'PASS' : 'FAIL', result3.success ? '' : result3.error.issues.map(i => i.message).join(', '));
}

function testAuthorization() {
  console.log('\n=== TEST AUTHORIZATION ===');

  const warehouseService = require('../src/modules/warehouse/warehouse.service');

  const testCases = [
    { role: 'admin_general', tipe: 'dadakan', expect: 'success' },
    { role: 'supervisor', tipe: 'dadakan', expect: 'error' },
    { role: 'staf_gudang', tipe: 'dadakan', expect: 'error' },
  ];

  for (const tc of testCases) {
    try {
      warehouseService.create({ nama_gudang: 'Test', tipe: tc.tipe }, 1, tc.role);
      console.log(`${tc.role} create dadakan: FAIL (should error)`);
    } catch (err) {
      if (tc.expect === 'error') {
        console.log(`${tc.role} create dadakan: PASS (${err.message})`);
      } else {
        console.log(`${tc.role} create dadakan: FAIL (unexpected error: ${err.message})`);
      }
    }
  }
}

testValidation();
testAuthorization();
