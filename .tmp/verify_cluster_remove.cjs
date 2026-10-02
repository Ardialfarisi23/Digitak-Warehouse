const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'backend', 'node_modules', '@prisma', 'client'));
const clusterService = require(path.join(__dirname, '..', 'backend', 'src', 'modules', 'cluster', 'cluster.service'));
const prisma = new PrismaClient();

async function main() {
  const TEST_CLUSTER_ID = 'TEST-REMOVE-' + Date.now();
  const ACTOR_ID = 5;
  const PROJECT_ID = 1;

  console.log('=== BEFORE ===');
  const beforeCluster = await prisma.$queryRaw`SELECT COUNT(*)::text as cnt FROM cluster`;
  const beforeAudit = await prisma.$queryRaw`SELECT COUNT(*)::text as cnt FROM audit_log`;
  console.log('cluster rows:', beforeCluster[0].cnt);
  console.log('audit_log rows:', beforeAudit[0].cnt);

  // Step A: create TEST cluster via service
  console.log('\n--- Step A: create TEST cluster ---');
  const created = await clusterService.create({
    cluster_id: TEST_CLUSTER_ID,
    project_id: String(PROJECT_ID),
    nama_cluster: 'TEST Remove',
    cluster_type: 'test',
    status_aktif: true,
  }, ACTOR_ID);
  console.log('created cluster_id:', created.cluster_id);

  // Step B: remove TEST cluster via service
  console.log('\n--- Step B: remove TEST cluster (should succeed) ---');
  try {
    const result = await clusterService.remove(TEST_CLUSTER_ID, ACTOR_ID);
    console.log('remove result:', result);
  } catch (err) {
    console.log('remove ERROR:', err.message, err.statusCode || '');
  }

  // Step C: verify audit_log for TEST delete
  console.log('\n--- Step C: verify audit_log ---');
  const auditAfterDelete = await prisma.$queryRaw`
    SELECT audit_id::text, entity_type, entity_id::text, aksi, data_sebelum, data_sesudah
    FROM audit_log
    WHERE entity_type = 'cluster' AND aksi = 'delete'
    ORDER BY audit_id DESC
    LIMIT 5
  `;
  console.log('recent cluster delete audits:', JSON.stringify(auditAfterDelete, null, 2));

  // Step D: remove used cluster (CL001) -> should 409
  console.log('\n--- Step D: remove used cluster CL001 (should 409) ---');
  try {
    await clusterService.remove('CL001', ACTOR_ID);
    console.log('remove CL001: unexpectedly succeeded');
  } catch (err) {
    console.log('remove CL001 ERROR:', err.message, 'status:', err.statusCode || '');
  }

  // Verify CL001 still exists
  const cl001 = await prisma.cluster.findUnique({
    where: { cluster_id: 'CL001' },
    select: { cluster_id: true, nama_cluster: true },
  });
  console.log('CL001 still exists:', !!cl001);

  // Cleanup: remove any leftover TEST cluster (if step B failed)
  console.log('\n--- Cleanup ---');
  const leftover = await prisma.cluster.findUnique({
    where: { cluster_id: TEST_CLUSTER_ID },
  });
  if (leftover) {
    await prisma.cluster.delete({ where: { cluster_id: TEST_CLUSTER_ID } });
    console.log('cleaned leftover TEST cluster');
  } else {
    console.log('no leftover TEST cluster');
  }

  // Remove audit_log entries for TEST cluster (both create and delete)
  const deletedAudit = await prisma.audit_log.deleteMany({
    where: {
      entity_type: 'cluster',
      data_sebelum: { path: ['cluster_id'], equals: TEST_CLUSTER_ID },
    },
  });
  console.log('cleaned audit_log rows for TEST cluster:', deletedAudit.count);

  console.log('\n=== AFTER ===');
  const afterCluster = await prisma.$queryRaw`SELECT COUNT(*)::text as cnt FROM cluster`;
  const afterAudit = await prisma.$queryRaw`SELECT COUNT(*)::text as cnt FROM audit_log`;
  console.log('cluster rows:', afterCluster[0].cnt);
  console.log('audit_log rows:', afterAudit[0].cnt);
}

main().catch(e => {
  console.log('FATAL:', e);
  process.exit(1);
});
