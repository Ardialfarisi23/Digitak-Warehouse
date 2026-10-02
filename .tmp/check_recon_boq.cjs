const prisma = require('D:/Project/digitak-warehouse/backend/src/config/prisma');

async function check() {
  const targetBoqIds = [7, 8, 10, 29];

  // Reproduce the exact whereBoq from reconciliation.repository.js getInventory
  const whereBoq = {
    boq: {
      status: { in: ["draft", "aktif", "selesai"] },
      source: "top_down",
    },
  };

  const boqItems = await prisma.boq_item.findMany({
    where: whereBoq,
    include: {
      boq: {
        include: {
          tiket: {
            select: {
              tiket_id: true,
              kode_tiket: true,
              used: true,
              project: {
                select: {
                  project_id: true,
                  nama_project: true,
                  area: true,
                  cluster_id: true,
                },
              },
            },
          },
          cluster: {
            include: {
              project: {
                select: {
                  cluster_id: true,
                  area: true,
                  nama_project: true,
                },
              },
            },
          },
        },
      },
      barang: {
        select: {
          kode_perangkat: true,
          nama_barang: true,
        },
      },
      satuan: {
        select: {
          kode_satuan: true,
        },
      },
      gudang_tujuan: {
        select: {
          nama_gudang: true,
        },
      },
    },
  });

  console.log(`Total boq_items: ${boqItems.length}\n`);

  // Group by project_id + barang_id like reconciliation does
  const aggregatedMap = new Map();
  for (const item of boqItems) {
    const tiket = item.boq?.tiket;
    const tiketProject = tiket?.project;
    const projectIdNum = Number(tiketProject?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;

    if (!aggregatedMap.has(key)) {
      aggregatedMap.set(key, {
        project_id: String(projectIdNum),
        project_nama: tiketProject?.nama_project || "-",
        barang_id: barangId,
        kode_perangkat: item.barang?.kode_perangkat || "-",
        nama_barang: item.barang?.nama_barang || "-",
        boq: 0,
        kode_tiket_list: [],
        source_boqs: new Set(),
      });
    }

    const agg = aggregatedMap.get(key);
    agg.boq += Number(item.qty_rencana || 0);
    agg.kode_tiket_list.push(tiket?.kode_tiket);
    agg.source_boqs.add(item.boq?.source);
  }

  // Check which target BOQ ids contributed to which aggregated rows
  const boqItemMap = new Map();
  for (const item of boqItems) {
    const boqId = Number(item.boq?.boq_id);
    if (!boqItemMap.has(boqId)) {
      boqItemMap.set(boqId, []);
    }
    boqItemMap.get(boqId).push(item);
  }

  console.log("=== Per-BOQ Contribution to Aggregated Rows ===");
  for (const id of targetBoqIds) {
    const items = boqItemMap.get(id) || [];
    const boq = items[0]?.boq;
    const tiket = boq?.tiket;
    const projectId = Number(tiket?.project?.project_id || 0);
    const barangId = String(items[0]?.barang_id);
    const key = `${projectId}-${barangId}`;
    const aggRow = aggregatedMap.get(key);

    console.log(`\nBOQ ${id}:`);
    console.log(`  items count: ${items.length}`);
    console.log(`  status: ${boq?.status}`);
    console.log(`  source: ${boq?.source}`);
    console.log(`  project_id: ${projectId}`);
    console.log(`  barang_id: ${barangId}`);
    console.log(`  aggregated row exists: ${!!aggRow}`);
    if (aggRow) {
      console.log(`  aggregated boq: ${aggRow.boq}`);
      console.log(`  aggregated kode_tiket: ${aggRow.kode_tiket_list.join(', ')}`);
    }
  }

  await prisma.$disconnect();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
