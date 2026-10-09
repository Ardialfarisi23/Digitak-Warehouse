// backend/scripts/import-boq/report.js
// Tulis laporan dry-run ke Markdown

const fs = require('fs');
const path = require('path');
const config = require('./config');

function ensureOutputDir() {
  if (!fs.existsSync(config.OUTPUT_DIR)) {
    fs.mkdirSync(config.OUTPUT_DIR, { recursive: true });
  }
}

function formatNumber(n) {
  return n === null ? 'NULL' : Number(n).toLocaleString('id-ID');
}

function writeReport(planResult, outputPath = null) {
  const { plan, blockers, warnings } = planResult;
  const reportFile = outputPath || path.join(config.OUTPUT_DIR, config.REPORT_FILE);
  ensureOutputDir();

  let md = '';
  md += `# LAPORAN DRY-RUN IMPORT BOQ EXCEL\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**File:** ${config.EXCEL_FILE}\n`;
  md += `**Sheet:** ${config.SHEET_NAME}\n`;
  md += `**User ID:** ${plan.project.created_by}\n\n`;

  // Ringkasan
  md += `## 1. RINGKASAN\n\n`;
  md += `| Metrik | Jumlah |\n|--------|--------|\n`;
  md += `| Project akan dibuat | ${plan.project.action === 'create' ? '1' : '0'} |\n`;
  md += `| Cluster akan dibuat | ${plan.clusters.filter(c => c.action === 'create').length} |\n`;
  md += `| BOQ akan dibuat | ${plan.clusters.filter(c => c.boq_action === 'create').length} |\n`;
  md += `| BOQ Item akan dibuat | ${plan.clusters.flatMap(c => c.items.filter(i => i.action === 'create')).length} |\n`;
  md += `| Dilewati (sudah ada) | ${plan.summary.conflict} |\n`;
  md += `| BLOCKER | ${blockers.length} |\n`;
  md += `| Peringatan | ${warnings.length} |\n\n`;

  // Estimasi after
  md += `### Estimasi hitungan tabel setelah import:\n\n`;
  md += `| Tabel | Sebelum | Akan dibuat | Estimasi setelah |\n|-------|---------|-------------|------------------|\n`;
  const ec = plan.existing_counts;
  const ea = plan.estimated_after;
  md += `| project | ${formatNumber(ec.project_count)} | ${plan.project.action === 'create' ? 1 : 0} | ${formatNumber(ea.project)} |\n`;
  md += `| cluster | ${formatNumber(ec.cluster_count)} | ${plan.clusters.filter(c => c.action === 'create').length} | ${formatNumber(ea.cluster)} |\n`;
  md += `| tiket_material | ${formatNumber(ec.tiket_count)} | 0 | ${formatNumber(ea.tiket)} |\n`;
  md += `| boq | ${formatNumber(ec.boq_count)} | ${plan.clusters.filter(c => c.boq_action === 'create').length} | ${formatNumber(ea.boq)} |\n`;
  md += `| boq_item | ${formatNumber(ec.boq_item_count)} | ${plan.clusters.flatMap(c => c.items.filter(i => i.action === 'create')).length} | ${formatNumber(ea.boq_item)} |\n\n`;

  // Project detail
  const proj = plan.project.data || plan.project;
  md += `## 2. PROJECT\n\n`;
  md += `| Field | Nilai |\n|-------|-------|\n`;
  md += `| nama_project | ${proj.nama_project} |\n`;
  md += `| title | ${proj.title} |\n`;
  md += `| area | ${proj.area} |\n`;
  md += `| kota_kabupaten | ${proj.kota_kabupaten} |\n`;
  md += `| kecamatan | ${proj.kecamatan} |\n`;
  md += `| desa_kelurahan | ${proj.desa_kelurahan} |\n`;
  md += `| provinsi | ${proj.provinsi} |\n`;
  md += `| klien | ${proj.klien} |\n`;
  md += `| status_aktif | ${proj.status_aktif} |\n`;
  md += `| created_by | ${plan.project.created_by} |\n`;
  md += `| action | ${plan.project.action} |\n`;
  if (plan.project.reason) md += `| reason | ${plan.project.reason} |\n`;
  md += `\n`;

  // Clusters detail
  md += `## 3. CLUSTER DETAIL (${plan.clusters.length} cluster)\n\n`;
  for (const c of plan.clusters) {
    md += `### Cluster ${c.cluster_id} — ${c.nama_cluster}\n\n`;
    md += `| Field | Nilai |\n|-------|-------|\n`;
    md += `| cluster_id | ${c.cluster_id} |\n`;
    md += `| nama_cluster | ${c.nama_cluster} |\n`;
    md += `| homepass_plan | ${formatNumber(c.homepass_plan)} |\n`;
    md += `| no_tiket_release | ${c.no_tiket_release || 'NULL'} |\n`;
    md += `| action | ${c.action} |\n`;
    if (c.reason) md += `| reason | ${c.reason} |\n`;
    md += `| boq_action | ${c.boq_action} |\n`;
    if (c.boq_reason) md += `| boq_reason | ${c.boq_reason} |\n`;
    md += `\n`;

    // Totals
    md += `**Totals per cluster:**\n\n`;
    md += `| Angka | Total |\n|-------|-------|\n`;
    md += `| BoQ Plan | ${formatNumber(c.totals.boq_plan)} |\n`;
    md += `| Additional | ${formatNumber(c.totals.additional)} |\n`;
    md += `| MOS | ${formatNumber(c.totals.mos)} |\n`;
    md += `| Used | ${formatNumber(c.totals.used)} |\n`;
    md += `| Remains (calc) | ${formatNumber(c.totals.remains)} |\n\n`;

    // Items table (ringkas: hanya yang create/blocker)
    const createItems = c.items.filter(i => i.action === 'create');
    const blockerItems = c.items.filter(i => i.action === 'blocker');
    const skipItems = c.items.filter(i => i.action === 'skip');

    md += `Items: **${createItems.length} akan dibuat**, ${blockerItems.length} blocker, ${skipItems.length} dilewati\n\n`;

    if (createItems.length > 0) {
      md += `| Row | Kode | Nama | BoQ Plan | Add | MOS | Used | Remains (calc) |\n|-----|------|------|----------|-----|-----|------|----------------|\n`;
      for (const item of createItems.slice(0, 20)) { // limit 20 per cluster
        md += `| ${item.row} | ${item.material_code} | ${item.material_name?.substring(0,40)} | ${formatNumber(item.boq_plan)} | ${formatNumber(item.additional)} | ${formatNumber(item.mos)} | ${formatNumber(item.used)} | ${formatNumber(item.remains_calc)} |\n`;
      }
      if (createItems.length > 20) md += `| ... | (${createItems.length - 20} item lainnya) | | | | | | |\n`;
      md += `\n`;
    }

    if (blockerItems.length > 0) {
      md += `**Blocker items:**\n`;
      for (const item of blockerItems) {
        md += `- Row ${item.row}: ${item.material_code} — ${item.reason}\n`;
      }
      md += `\n`;
    }
  }

  // BLOCKERS
  md += `## 4. BLOCKER (${blockers.length})\n\n`;
  if (blockers.length === 0) {
    md += `Tidak ada BLOCKER. Import bisa dijalankan (--execute).\n\n`;
  } else {
    md += `⚠️ **IMPORT DITOLAK** — ada ${blockers.length} BLOCKER. Perbaiki sebelum --execute.\n\n`;
    for (const b of blockers) {
      md += `- ${b}\n`;
    }
    md += `\n`;
  }

  // WARNINGS
  md += `## 5. PERINGATAN (${warnings.length})\n\n`;
  if (warnings.length === 0) {
    md += `Tidak ada peringatan.\n\n`;
  } else {
    for (const w of warnings) {
      md += `- ${w}\n`;
    }
    md += `\n`;
  }

  // Special: NET-H-004410
  const c4410 = plan.clusters.find(c => c.cluster_id === 'NET-H-004410');
  if (c4410) {
    md += `## 6. KHUSUS: NET-H-004410 (INCOMPLETE)\n\n`;
    md += `Cluster ini hanya memiliki kolom BoQ Plan di Excel. Additional/MOS/Used/Remains = NULL.\n`;
    md += `Items akan dibuat: ${c4410.items.filter(i => i.action === 'create').length}\n\n`;
  }

  // Verification checklist
  md += `## 7. CHECKLIST VERIFIKASI SEBELUM --execute\n\n`;
  md += `- [ ] Semua 49 material code cocok di DB\n`;
  md += `- [ ] User ID ${plan.project.created_by} ada dan role admin/supervisor\n`;
  md += `- [ ] Backup file backup_before_boq_import_*.dump ada di D:\\Project\\digitak-warehouse, size > 0, < 24 jam\n`;
  md += `- [ ] Tidak ada BLOCKER di atas\n`;
  md += `- [ ] Field NOT NULL project (kota_kabupaten, kecamatan) sudah diisi\n`;
  md += `- [ ] Enum status BOQ "draft" valid di schema\n\n`;

  fs.writeFileSync(reportFile, md, 'utf8');
  return reportFile;
}

module.exports = { writeReport };