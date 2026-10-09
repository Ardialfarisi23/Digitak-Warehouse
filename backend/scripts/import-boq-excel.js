// backend/scripts/import-boq-excel.js
// Entry point untuk import BOQ dari Excel

const fs = require('fs');
const path = require('path');
const { parseExcel } = require('./import-boq/parse-excel');
const { generatePlan, getExistingCounts } = require('./import-boq/plan');
const { writeReport } = require('./import-boq/report');
const { executeImport } = require('./import-boq/execute');
const { verifyImport } = require('./import-boq/verify');
const { rollbackImport } = require('./import-boq/rollback');
const config = require('./import-boq/config');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    dryRun: true,
    execute: false,
    verify: false,
    rollback: false,
    rollbackExecute: false,
    userId: config.DEFAULT_USER_ID,
    file: config.EXCEL_FILE,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        result.dryRun = true;
        result.execute = false;
        break;
      case '--execute':
        result.execute = true;
        result.dryRun = false;
        break;
      case '--verify':
        result.verify = true;
        break;
      case '--rollback':
        result.rollback = true;
        break;
      case '--rollback-execute':
        result.rollback = true;
        result.rollbackExecute = true;
        break;
      case '--user-id':
        result.userId = parseInt(args[++i], 10);
        break;
      case '--file':
        result.file = args[++i];
        break;
    }
  }

  return result;
}

async function main() {
  const opts = parseArgs();
  console.log('=== IMPORT BOQ EXCEL ===');
  console.log(`Mode: ${opts.dryRun ? 'DRY-RUN' : opts.execute ? 'EXECUTE' : opts.verify ? 'VERIFY' : opts.rollback ? 'ROLLBACK' : 'UNKNOWN'}`);
  console.log(`User ID: ${opts.userId}`);
  console.log(`File: ${opts.file}`);

  try {
    // 1. Parse Excel
    console.log('\n[1/5] Parsing Excel...');
    const parsedData = await parseExcel(opts.file);
    console.log(`  Parsed: ${parsedData.meta.total_clusters} clusters, ${parsedData.meta.total_items} items`);
    console.log(`  Warnings: ${parsedData.warnings.length}`);

    // 2. Generate Plan
    console.log('\n[2/5] Generating plan (checking DB)...');
    const planResult = await generatePlan(parsedData, opts.userId);
    console.log(`  Project: ${planResult.plan.project.action}`);
    console.log(`  Clusters: ${planResult.plan.clusters.filter(c => c.action === 'create').length} create, ${planResult.plan.clusters.filter(c => c.action === 'skip').length} skip`);
    console.log(`  BOQs: ${planResult.plan.clusters.filter(c => c.boq_action === 'create').length} create`);
    console.log(`  Items: ${planResult.plan.clusters.flatMap(c => c.items.filter(i => i.action === 'create')).length} create`);
    console.log(`  Blockers: ${planResult.blockers.length}`);
    console.log(`  Warnings: ${planResult.warnings.length}`);

    // 3. Write Report
    console.log('\n[3/5] Writing report...');
    const reportPath = writeReport(planResult);
    console.log(`  Report: ${reportPath}`);

    // 4. Execute or Verify
    if (opts.rollback) {
      console.log('\n[4/5] Rollback...');
      const result = await rollbackImport(!opts.rollbackExecute);
      console.log('Rollback result:', result);
      return;
    }

    if (opts.verify) {
      console.log('\n[4/5] Verifying...');
      const verifyResult = await verifyImport(parsedData, opts.userId);
      console.log(`  Match: ${verifyResult.match}`);
      console.log(`  Summary:`, verifyResult.summary);
      console.log(`  Orphans:`, verifyResult.orphan);
      console.log(`  Discrepancies: ${verifyResult.discrepancies.length}`);
      for (const d of verifyResult.discrepancies) console.log(`    - ${d}`);
      return;
    }

    if (opts.dryRun) {
      console.log('\n[4/5] DRY-RUN complete. No DB changes made.');
      console.log('  To execute: node backend/scripts/import-boq-excel.js --execute --user-id <id>');
      return;
    }

    if (opts.execute) {
      if (planResult.blockers.length > 0) {
        console.error('\n❌ EXECUTE DITOLAK: BLOCKER ditemukan:');
        for (const b of planResult.blockers) console.error(`  - ${b}`);
        process.exit(1);
      }

      console.log('\n[4/5] Executing import...');
      const manifest = await executeImport(planResult, opts.userId);
      console.log('\n[5/5] Verifying after import...');
      const verifyResult = await verifyImport(parsedData, opts.userId);
      console.log(`  Match: ${verifyResult.match}`);
      console.log(`  Summary:`, verifyResult.summary);
      if (!verifyResult.match) {
        console.error('  Discrepancies:', verifyResult.discrepancies);
      } else {
        console.log('  ✅ Verification PASSED');
      }
      return;
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  } finally {
    await require('@prisma/client').PrismaClient.prototype.$disconnect();
  }
}

main();