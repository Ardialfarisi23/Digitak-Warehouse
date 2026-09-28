const boqService = require('./src/modules/boq/boq.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== TEST CREATE BOQ WITH CLUSTER ===\n');

  const testClusterId = 'CL005';
  const testUserId = 1;

  const existingBoqCount = await prisma.boq.count();
  console.log(`Current BOQ count: ${existingBoqCount}`);

  const testData = {
    projectId: '5',
    area: 'Tasikmalaya',
    ticketNumber: 'TKT-TEST-CLUSTER-' + Date.now(),
    clusterId: 'CL005',
    status: 'DRAFT',
    source: 'TOP_DOWN',
    externalVerificationStatus: 'MENUNGGU',
    notes: 'Test BOQ for cluster validation',
    referenceFile: null,
    emailReference: null,
    items: [
      {
        itemCode: 'CBL-00043',
        itemName: 'Test Cable',
        quantity: 10,
        unit: 'roll',
        destinationWarehouseId: null,
        notes: 'Test item',
      },
    ],
  };

  try {
    const result = await boqService.create(testData, testUserId);
    console.log('✓ BOQ created successfully');
    console.log(`  boq_id: ${result.boq_id}`);
    console.log(`  boq_number: ${result.boq_number}`);
    console.log(`  tiket_id: ${result.tiket_id}`);
    console.log(`  cluster_id: ${result.cluster_id}`);

    const newBoqCount = await prisma.boq.count();
    console.log(`\nNew BOQ count: ${newBoqCount} (expected: ${existingBoqCount + 1})`);

    const tiket = await prisma.tiket_material.findUnique({
      where: { tiket_id: result.tiket_id },
      select: { kode_tiket: true, cluster_id: true },
    });
    console.log(`Tiket cluster_id: ${tiket?.cluster_id}`);

    console.log('\n--- Testing duplicate active BOQ for same cluster ---');
    try {
      await boqService.create(testData, testUserId);
      console.log('✗ FAIL: Should have thrown error for duplicate active BOQ');
    } catch (err) {
      console.log(`✓ Correctly rejected: ${err.message}`);
    }

    console.log('\n--- Testing invalid cluster ---');
    try {
      await boqService.create(
        { ...testData, ticketNumber: 'TKT-TEST-INVALID-' + Date.now(), clusterId: 'INVALID-CLUSTER' },
        testUserId
      );
      console.log('✗ FAIL: Should have thrown error for invalid cluster');
    } catch (err) {
      console.log(`✓ Correctly rejected: ${err.message}`);
    }

    console.log('\n=== CLEANUP ===');
    console.log('Test data created:');
    console.log(`  BOQ ID: ${result.boq_id}`);
    console.log(`  Tiket ID: ${result.tiket_id}`);
    console.log(`  Kode Tiket: ${testData.ticketNumber}`);
    console.log('\nPlease manually delete these test records or run cleanup script.');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
