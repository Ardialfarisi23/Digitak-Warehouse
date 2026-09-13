const { createWarehouseSchema, updateWarehouseSchema } = require('../src/modules/warehouse/warehouse.validation');

function testValidation() {
  console.log('=== TEST VALIDASI ===');

  const tetapNoProject = {
    nama_gudang: 'Gudang Baru',
    tipe: 'tetap',
  };
  const result1 = createWarehouseSchema.safeParse(tetapNoProject);
  console.log('1. tetap tanpa project_id:', result1.success ? 'PASS' : 'FAIL', result1.success ? '' : result1.error.issues.map(i => i.message).join(', '));

  const dadakanNoProject = {
    nama_gudang: 'Gudang Dadakan Baru',
    tipe: 'dadakan',
  };
  const result2 = createWarehouseSchema.safeParse(dadakanNoProject);
  console.log('2. dadakan tanpa project_id:', result2.success ? 'FAIL (should error)' : 'PASS', !result2.success ? result2.error.issues.map(i => i.message).join(', ') : '');

  const dadakanWithProject = {
    nama_gudang: 'Gudang Dadakan Baru',
    tipe: 'dadakan',
    project_id: 1,
  };
  const result3 = createWarehouseSchema.safeParse(dadakanWithProject);
  console.log('3. dadakan dengan project_id:', result3.success ? 'PASS' : 'FAIL', result3.success ? '' : result3.error.issues.map(i => i.message).join(', '));
}

function testUpdateValidation() {
  console.log('\n=== TEST UPDATE VALIDASI ===');

  const emptyUpdate = {};
  const result1 = updateWarehouseSchema.safeParse(emptyUpdate);
  console.log('4. update tanpa field:', result1.success ? 'FAIL (should error)' : 'PASS', !result1.success ? result1.error.issues.map(i => i.message).join(', ') : '');

  const updateDadakanNoProject = { tipe: 'dadakan' };
  const result2 = updateWarehouseSchema.safeParse(updateDadakanNoProject);
  console.log('5. update tipe dadakan tanpa project_id:', result2.success ? 'FAIL (should error)' : 'PASS', !result2.success ? result2.error.issues.map(i => i.message).join(', ') : '');
}

testValidation();
testUpdateValidation();
