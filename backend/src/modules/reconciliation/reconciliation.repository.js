const prisma = require("../../config/prisma");
const returnRepository = require("../return/return.repository");
const { getApprovedReturnsAfterSnapshot, getLatestPhysicalSnapshot } = returnRepository;
const { computeRemains, computeReconciliationStatus } = require("./reconciliation.utils");

const getInventory = async (filters = {}, actor = null) => {
  const { search = "", projectId = "all", warehouseId = "all", status = "all" } = filters;

  const whereBoq = {
    boq: {
      status: { in: ["draft", "aktif", "selesai"] },
      source: "top_down",
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
  const usedByProjectBarang = new Map();

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

  const laporanWhere = { is_aktif: true };
  if (projectId !== "all") {
    laporanWhere.project_id = BigInt(projectId);
  }

  const activeLaporans = await prisma.laporan_mitra.findMany({
    where: laporanWhere,
    select: {
      tiket_id: true,
      project_id: true,
      barang_id: true,
      nama_barang: true,
      used: true,
    },
  });

  const barangLookupCache = new Map();
  const laporanUsedByTicketBarang = new Map();
  const ticketProjectMap = new Map();

  for (const laporan of activeLaporans) {
    let barangId = laporan.barang_id ? String(laporan.barang_id) : null;

    if (!barangId && laporan.nama_barang) {
      const namaTrimmed = String(laporan.nama_barang).trim();
      if (barangLookupCache.has(namaTrimmed)) {
        barangId = barangLookupCache.get(namaTrimmed);
      } else {
        const barang = await prisma.barang.findFirst({
          where: { nama_barang: namaTrimmed },
          select: { barang_id: true },
        });
        const resolved = barang ? String(barang.barang_id) : null;
        barangLookupCache.set(namaTrimmed, resolved);
        barangId = resolved;
      }
    }

    if (!barangId) continue;

    const ticketIdNum = String(laporan.tiket_id || 0);
    const projectIdNum = String(laporan.project_id || 0);
    const ticketBarangKey = `${ticketIdNum}-${barangId}`;
    const usedVal = Number(laporan.used || 0);

    laporanUsedByTicketBarang.set(ticketBarangKey, (laporanUsedByTicketBarang.get(ticketBarangKey) || 0) + usedVal);
    ticketProjectMap.set(ticketBarangKey, projectIdNum);
  }

  const aggregatedMap = new Map();
  const gudangByKey = new Map();
  const satuanByKey = new Map();

  for (const [ticketBarangKey, laporanUsed] of laporanUsedByTicketBarang.entries()) {
    if (laporanUsed <= 0) continue;

    const projectIdNum = ticketProjectMap.get(ticketBarangKey) || "0";
    const [, barangId] = ticketBarangKey.split("-");
    const projectBarangKey = `${projectIdNum}-${barangId}`;

    usedByProjectBarang.set(projectBarangKey, (usedByProjectBarang.get(projectBarangKey) || 0) + laporanUsed);
  }

  for (const item of boqItems) {
    const tiket = item.boq?.tiket;
    const tiketProject = tiket?.project;
    const clusterProject = item.boq?.cluster?.project;
    const projectIdNum = Number(tiketProject?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;

    if (!aggregatedMap.has(key)) {
      const clusterId = clusterProject?.cluster_id || tiketProject?.cluster_id || "-";
      const area = clusterProject?.area || tiketProject?.area || "-";

      aggregatedMap.set(key, {
        project_id: String(projectIdNum),
        project_nama: tiketProject?.nama_project || "-",
        cluster_id: clusterId,
        area: area,
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

    if (item.gudang_tujuan?.nama_gudang) {
      gudangByKey.get(key).add(item.gudang_tujuan.nama_gudang);
    }
    if (item.satuan?.kode_satuan) {
      satuanByKey.get(key).add(item.satuan?.kode_satuan);
    }
  }

  // Compute approved returns per project+barang from the Return module.
  const approvedReturnByProjectBarang = new Map();

  for (const agg of aggregatedMap.values()) {
    const projectIdNum = Number(agg.project_id);
    const barangId = String(agg.barang_id);
    const key = `${agg.project_id}-${agg.barang_id}`;

    const projectTickets = new Set();
    for (const item of boqItems) {
      const tiket = item.boq?.tiket;
      const project = tiket?.project;
      if (Number(project?.project_id || 0) === projectIdNum) {
        projectTickets.add(tiket.tiket_id);
      }
    }

    let totalApprovedQty = 0;
    for (const tiketId of projectTickets) {
      const { snapshot } = await getLatestPhysicalSnapshot(tiketId, barangId);
      if (!snapshot) continue;

      const qty = await getApprovedReturnsAfterSnapshot(tiketId, barangId, snapshot.tanggal_laporan);
      totalApprovedQty += Number(qty);
    }

    approvedReturnByProjectBarang.set(key, totalApprovedQty);
  }

  let rows = Array.from(aggregatedMap.values()).map((agg) => {
    const key = `${agg.project_id}-${agg.barang_id}`;
    const additional = Number(additionalByProjectBarang.get(key) || 0);
    const mos = Number(mosByProjectBarang.get(key) || 0);
    const used = Number(usedByProjectBarang.get(key) || 0) > 0
      ? Number(usedByProjectBarang.get(key) || 0)
      : Number(outboundByProjectBarang.get(key) || 0);
    const approvedReturnQty = Number(approvedReturnByProjectBarang.get(key) || 0);
    const remains = computeRemains(mos, agg.boq, additional, used, approvedReturnQty);

    const recStatus = computeReconciliationStatus(remains);

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
      approved_return_qty: approvedReturnQty,
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
