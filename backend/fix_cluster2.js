const fs = require('fs');
let c = fs.readFileSync('src/modules/reconciliation/reconciliation.repository.js', 'utf8');

const oldSection = `    for (const item of shipmentItems) {
      const itemId = Number(item.item_id);
      const clusterId = clusterByItemId.get(itemId);
      const projectIdNum = Number(item.surat_jalan?.project_id || 0);
      const barangId = String(item.barang_id);
      const qty = Number(item.qty || 0);

      if (clusterId) {
        const key = \`\${clusterId}-\${barangId}\`;

        if (item.surat_jalan?.tipe === "inbound") {
          inboundByClusterBarang.set(key, (inboundByClusterBarang.get(key) || 0) + qty);
          if (isMosEligibleInbound(item.surat_jalan)) {
            mosByClusterBarang.set(key, (mosByClusterBarang.get(key) || 0) + qty);
          }
        }

        if (item.surat_jalan?.tipe === "outbound" && item.surat_jalan?.tujuan_tipe !== "gudang") {
          outboundByClusterBarang.set(key, (outboundByClusterBarang.get(key) || 0) + qty);
          mosByClusterBarang.set(key, (mosByClusterBarang.get(key) || 0) + qty);
        }
      } else {
        const key = \`unassigned-\${projectIdNum}-\${barangId}\`;
        if (item.surat_jalan?.tipe === "inbound") {
          inboundByClusterBarang.set(key, (inboundByClusterBarang.get(key) || 0) + qty);
          if (isMosEligibleInbound(item.surat_jalan)) {
            mosByClusterBarang.set(key, (mosByClusterBarang.get(key) || 0) + qty);
          }
        }
        if (item.surat_jalan?.tipe === "outbound" && item.surat_jalan?.tujuan_tipe !== "gudang") {
          outboundByClusterBarang.set(key, (outboundByClusterBarang.get(key) || 0) + qty);
          mosByClusterBarang.set(key, (mosByClusterBarang.get(key) || 0) + qty);
        }
        unassignedByProjectBarang.set(key, (unassignedByProjectBarang.get(key) || 0) + 1);
      }
    }

    for (const [key, val] of additionalByClusterBarangFromAdjustment) {
      additionalByClusterBarang.set(key, (additionalByClusterBarang.get(key) || 0) + val);
    }

    for (const laporan of activeLaporans) {`;

const newSection = `    // Track inbound MOS and outbound MOS separately for cluster mode, then combine with max()
    const inboundMosByClusterBarang = new Map();
    const outboundMosByClusterBarang = new Map();

    for (const item of shipmentItems) {
      const itemId = Number(item.item_id);
      const clusterId = clusterByItemId.get(itemId);
      const projectIdNum = Number(item.surat_jalan?.project_id || 0);
      const barangId = String(item.barang_id);
      const qty = Number(item.qty || 0);

      if (clusterId) {
        const key = \`\${clusterId}-\${barangId}\`;

        if (item.surat_jalan?.tipe === "inbound") {
          inboundByClusterBarang.set(key, (inboundByClusterBarang.get(key) || 0) + qty);
          if (isMosEligibleInbound(item.surat_jalan)) {
            inboundMosByClusterBarang.set(key, (inboundMosByClusterBarang.get(key) || 0) + qty);
          }
        }

        if (item.surat_jalan?.tipe === "outbound" && item.surat_jalan?.tujuan_tipe !== "gudang") {
          outboundByClusterBarang.set(key, (outboundByClusterBarang.get(key) || 0) + qty);
          outboundMosByClusterBarang.set(key, (outboundMosByClusterBarang.get(key) || 0) + qty);
        }
      } else {
        const key = \`unassigned-\${projectIdNum}-\${barangId}\`;
        if (item.surat_jalan?.tipe === "inbound") {
          inboundByClusterBarang.set(key, (inboundByClusterBarang.get(key) || 0) + qty);
          if (isMosEligibleInbound(item.surat_jalan)) {
            inboundMosByClusterBarang.set(key, (inboundMosByClusterBarang.get(key) || 0) + qty);
          }
        }
        if (item.surat_jalan?.tipe === "outbound" && item.surat_jalan?.tujuan_tipe !== "gudang") {
          outboundByClusterBarang.set(key, (outboundByClusterBarang.get(key) || 0) + qty);
          outboundMosByClusterBarang.set(key, (outboundMosByClusterBarang.get(key) || 0) + qty);
        }
        unassignedByProjectBarang.set(key, (unassignedByProjectBarang.get(key) || 0) + 1);
      }
    }

    // Combine MOS: max(inbound, outbound) per key for cluster mode
    mosByClusterBarang = combineMos(inboundMosByClusterBarang, outboundMosByClusterBarang);

    for (const laporan of activeLaporans) {`;

if (c.includes(oldSection)) {
  c = c.replace(oldSection, newSection);
  fs.writeFileSync('src/modules/reconciliation/reconciliation.repository.js', c);
  console.log('Replaced successfully');
} else {
  console.log('Old section not found');
  // Try with CRLF
  const oldCRLF = oldSection.replace(/\n/g, '\r\n');
  if (c.includes(oldCRLF)) {
    c = c.replace(oldCRLF, newSection.replace(/\n/g, '\r\n'));
    fs.writeFileSync('src/modules/reconciliation/reconciliation.repository.js', c);
    console.log('Replaced successfully with CRLF');
  } else {
    console.log('Not found with CRLF either');
    // Debug: find similar content
    const idx = c.indexOf('for (const item of shipmentItems) {', 26000);
    if (idx >= 0) {
      console.log('Found at:', idx);
      console.log('Context:', c.substring(idx, idx + 100));
    }
  }
}