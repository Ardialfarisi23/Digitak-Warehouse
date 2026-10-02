const prisma = require('D:/Project/digitak-warehouse/backend/src/config/prisma');

async function verify() {
  const targetBoqIds = [7, 8, 10, 29];
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

  // Reproduce aggregation with boq_list
  const aggregatedMap = new Map();
  const boqListByKey = new Map();

  for (const item of boqItems) {
    const tiket = item.boq?.tiket;
    const tiketProject = tiket?.project;
    const clusterProject = item.boq?.cluster?.project;
    const projectIdNum = Number(tiketProject?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;

    if (!aggregatedMap.has(key)) {
      aggregatedMap.set(key, { project_id: String(projectIdNum), barang_id: barangId, boq: 0 });
      boqListByKey.set(key, []);
    }

    const agg = aggregatedMap.get(key);
    agg.boq += Number(item.qty_rencana || 0);

    const boqList = boqListByKey.get(key);
    const existingBoqIndex = boqList.findIndex((b) => b.boq_id === String(item.boq?.boq_id));
    const boqEntry = {
      boq_id: String(item.boq?.boq_id || ""),
      kode_boq: item.boq?.boq_number || "",
      status: item.boq?.status || "",
    };
    if (existingBoqIndex >= 0) {
      boqList[existingBoqIndex] = boqEntry;
    } else {
      boqList.push(boqEntry);
    }
  }

  // Show boq_list for project_id=7 barang_id=1 and barang_id=46
  const key1 = `7-1`;
  const key2 = `7-46`;

  console.log(`=== Row ${key1} (project_id=7, barang_id=1) ===`);
  console.log(`boq_list: ${JSON.stringify(boqListByKey.get(key1) || [])}`);
  console.log(`ada_boq_selesai: ${(boqListByKey.get(key1) || []).some((b) => b.status === "selesai")}`);
  console.log(`boq qty: ${aggregatedMap.get(key1)?.boq || 0}`);

  console.log(`\n=== Row ${key2} (project_id=7, barang_id=46) ===`);
  console.log(`boq_list: ${JSON.stringify(boqListByKey.get(key2) || [])}`);
  console.log(`ada_boq_selesai: ${(boqListByKey.get(key2) || []).some((b) => b.status === "selesai")}`);
  console.log(`boq qty: ${aggregatedMap.get(key2)?.boq || 0}`);

  await prisma.$disconnect();
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
