const prisma = require("../../config/prisma");

const getInventory = async (filters = {}, actor = null) => {
  const { search = "", projectId = "all", warehouseId = "all", status = "all" } = filters;

  const whereBoq = {
    boq: {
      status: { in: ["draft", "aktif", "selesai"] },
    },
  };

  if (warehouseId !== "all") {
    whereBoq.gudang_tujuan_id = BigInt(warehouseId);
  }

  if (projectId !== "all") {
    whereBoq.boq.tiket = { project_id: BigInt(projectId) };
  }

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

  const shipmentWhere = {
    surat_jalan: {
      status: { in: ["disetujui", "diterima_didistribusikan"] },
    },
  };

  if (projectId !== "all") {
    shipmentWhere.surat_jalan.project_id = BigInt(projectId);
  }

  const shipmentItems = await prisma.surat_jalan_item.findMany({
    where: shipmentWhere,
    include: {
      surat_jalan: {
        select: {
          tipe: true,
          project_id: true,
          boq_id: true,
          tujuan_tipe: true,
        },
      },
    },
  });

  const inboundByProjectBarang = new Map();
  const outboundByProjectBarang = new Map();
  const additionalByProjectBarang = new Map();
  const mosByProjectBarang = new Map();

  for (const item of shipmentItems) {
    const projectIdNum = Number(item.surat_jalan?.project_id);
    const barangId = String(item.barang_id);
    const qty = Number(item.qty || 0);
    const key = `${projectIdNum}-${barangId}`;

    if (item.surat_jalan?.tipe === "inbound") {
      if (item.is_kelebihan) {
        additionalByProjectBarang.set(key, (additionalByProjectBarang.get(key) || 0) + qty);
      } else {
        inboundByProjectBarang.set(key, (inboundByProjectBarang.get(key) || 0) + qty);
      }
    }

    if (item.surat_jalan?.tipe === "outbound" && item.surat_jalan?.tujuan_tipe !== "gudang") {
      outboundByProjectBarang.set(key, (outboundByProjectBarang.get(key) || 0) + qty);
      mosByProjectBarang.set(key, (mosByProjectBarang.get(key) || 0) + qty);
    }
  }

  const aggregatedMap = new Map();
  const gudangByKey = new Map();
  const satuanByKey = new Map();
  const usedByProjectBarang = new Map();

  for (const item of boqItems) {
    const tiket = item.boq?.tiket;
    const project = tiket?.project;
    const projectIdNum = Number(project?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;

    if (!aggregatedMap.has(key)) {
      aggregatedMap.set(key, {
        project_id: String(projectIdNum),
        project_nama: project?.nama_project || "-",
        cluster_id: project?.cluster_id || "-",
        area: project?.area || "-",
        barang_id: barangId,
        kode_perangkat: item.barang?.kode_perangkat || "-",
        nama_barang: item.barang?.nama_barang || "-",
        satuan: item.satuan?.kode_satuan || "-",
        boq: 0,
        kode_tiket_list: [],
      });
      gudangByKey.set(key, new Set());
      satuanByKey.set(key, new Set());
    }

    const agg = aggregatedMap.get(key);
    agg.boq += Number(item.qty_rencana || 0);
    agg.kode_tiket_list.push(tiket?.kode_tiket);

    const tiketUsed = Number(tiket?.used || 0);
    if (tiketUsed > 0) {
      usedByProjectBarang.set(key, (usedByProjectBarang.get(key) || 0) + tiketUsed);
    }

    if (item.gudang_tujuan?.nama_gudang) {
      gudangByKey.get(key).add(item.gudang_tujuan.nama_gudang);
    }
    if (item.satuan?.kode_satuan) {
      satuanByKey.get(key).add(item.satuan?.kode_satuan);
    }
  }

  let rows = Array.from(aggregatedMap.values()).map((agg) => {
    const key = `${agg.project_id}-${agg.barang_id}`;
    const additional = Number(additionalByProjectBarang.get(key) || 0);
    const mos = Number(mosByProjectBarang.get(key) || 0);
    const used = Number(usedByProjectBarang.get(key) || 0) > 0
      ? Number(usedByProjectBarang.get(key) || 0)
      : Number(outboundByProjectBarang.get(key) || 0);
    const remains = mos - (agg.boq + additional);

    let recStatus = "berjalan";
    if (remains < 0) {
      recStatus = "perhatian";
    } else if (mos >= agg.boq + additional && agg.boq > 0) {
      recStatus = "sesuai";
    }

    const uniqueTikets = [...new Set(agg.kode_tiket_list)].filter(Boolean);
    const kodeTiketStr = uniqueTikets.join(", ") || "-";
    const gudangList = [...(gudangByKey.get(key) || [])];
    const gudangNama = gudangList.join(", ") || "-";
    const satuanList = [...(satuanByKey.get(key) || [])];
    const satuanStr = satuanList.join(", ") || "-";

    return {
      id: key,
      project_id: agg.project_id,
      project_nama: agg.project_nama,
      cluster_id: agg.cluster_id,
      area: agg.area,
      tiket_id: "",
      kode_tiket: kodeTiketStr,
      barang_id: agg.barang_id,
      kode_perangkat: agg.kode_perangkat,
      nama_barang: agg.nama_barang,
      gudang_nama: gudangNama,
      satuan: satuanStr,
      boq: agg.boq,
      additional,
      mos,
      used,
      remains,
      status: recStatus,
    };
  });

  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter((row) => [row.project_nama, row.kode_tiket, row.kode_perangkat, row.nama_barang, row.gudang_nama].join(" ").toLowerCase().includes(q));
  }

  if (status !== "all") {
    rows = rows.filter((row) => row.status === status);
  }

  return { data: rows };
};

module.exports = {
  getInventory,
};
