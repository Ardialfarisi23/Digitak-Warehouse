const prisma = require("../../config/prisma");
const returnRepository = require("../return/return.repository");
const { getApprovedReturnsAfterSnapshot, getLatestPhysicalSnapshot } = returnRepository;
const { computeRemains, computeReconciliationStatus, buildPickSummary, buildItemPickSummary } = require("./reconciliation.utils");

// Stok sudah berkurang saat picking, jadi angka rekonsiliasi tidak boleh naik-turun saat barang di perjalanan.
const RECONCILIATION_SHIPMENT_STATUSES = [
  "disetujui",
  "sedang_dikirim",
  "tiba_di_transit",
  "tiba_menunggu_konfirmasi",
  "diterima_didistribusikan",
];

const getInventory = async (filters = {}, actor = null) => {
  const { search = "", projectId = "all", warehouseId = "all", status = "all", groupBy = "project", clusterId = "all" } = filters;

  const isCluster = groupBy === "cluster";

  function resolveClusterId(boqItem, shipmentItem, laporan, projectClusterMap) {
    if (!isCluster) return null;
    const fromBoq = boqItem?.boq?.cluster?.cluster_id || shipmentItem?.surat_jalan?.boq?.cluster_id || laporan?.tiket?.boq?.cluster_id;
    if (fromBoq) return fromBoq;
    const fromTiket = boqItem?.boq?.tiket?.cluster_id || shipmentItem?.surat_jalan?.tiket?.cluster_id || laporan?.tiket?.cluster_id;
    if (fromTiket) return fromTiket;
    const projectId = shipmentItem?.surat_jalan?.project_id || laporan?.project_id;
    if (projectId && projectClusterMap) {
      const clusters = projectClusterMap.get(Number(projectId));
      if (clusters && clusters.size === 1) {
        return Array.from(clusters)[0];
      }
    }
    return null;
  }

  async function buildClusterPicInfo(clusterIds) {
    if (!isCluster || !clusterIds.size) return new Map();
    const clusters = await prisma.cluster.findMany({
      where: { cluster_id: { in: Array.from(clusterIds) } },
      include: { pic: { select: { personil_id: true, nama: true } } },
    });
    const picByCluster = new Map();
    for (const c of clusters) {
      picByCluster.set(c.cluster_id, c.pic ? { nama: c.pic.nama, sumber: "internal" } : null);
    }
    return picByCluster;
  }

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
    if (isCluster) {
      whereBoq.boq.cluster = { project_id: BigInt(projectId) };
    } else {
      whereBoq.boq.tiket = { project_id: BigInt(projectId) };
    }
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
                select: {
                  cluster_id: true,
                  nama_cluster: true,
                  cluster_type: true,
                  project_type: true,
                  alamat_lengkap: true,
                  kso_partner: true,
                  kso_contact: true,
                  no_tiket_release: true,
                  vendor: true,
                  homepass_plan: true,
                  status_aktif: true,
                  project: {
                    select: {
                      cluster_id: true,
                      area: true,
                      nama_project: true,
                    },
                  },
                  pic: {
                    select: {
                      personil_id: true,
                      nama: true,
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

  const projectClusterMap = new Map();
  if (isCluster) {
    for (const item of boqItems) {
      const cluster = item.boq?.cluster;
      const project = cluster?.project || item.boq?.tiket?.project;
      const pid = project?.project_id;
      const cid = cluster?.cluster_id;
      if (!pid || !cid) continue;
      if (!projectClusterMap.has(pid)) {
        projectClusterMap.set(pid, new Set());
      }
      projectClusterMap.get(pid).add(cid);
    }
  }

  const shipmentWhere = {
    surat_jalan: {
      status: { in: RECONCILIATION_SHIPMENT_STATUSES },
    },
  };

  if (projectId !== "all") {
    shipmentWhere.surat_jalan.project_id = BigInt(projectId);
  }

  const shipmentBoqSelect = isCluster
    ? {
        boq: {
          select: {
            cluster_id: true,
          },
        },
      }
    : {};

  const shipmentItems = await prisma.surat_jalan_item.findMany({
    where: shipmentWhere,
    include: {
      surat_jalan: {
        select: {
          tipe: true,
          project_id: true,
          boq_id: true,
          tujuan_tipe: true,
          ...shipmentBoqSelect,
        },
      },
    },
  });

  const itemIdToClusterBarangKey = new Map();
  const itemIdToProjectBarangKey = new Map();
  for (const item of shipmentItems) {
    const projectIdNum = Number(item.surat_jalan?.project_id);
    const barangId = String(item.barang_id);
    itemIdToProjectBarangKey.set(Number(item.item_id), `${projectIdNum}-${barangId}`);
    const clusterId = isCluster ? resolveClusterId(null, item, null) : null;
    if (isCluster && clusterId) {
      itemIdToClusterBarangKey.set(Number(item.item_id), `${clusterId}-${barangId}`);
    }
  }

  const shipmentItemIds = shipmentItems.map((it) => Number(it.item_id)).filter((id) => !Number.isNaN(id) && id > 0);

  const pickRows = shipmentItemIds.length > 0
    ? await prisma.surat_jalan_item_pick.groupBy({
        by: ["surat_jalan_item_id", "kondisi_diambil", "is_override"],
        where: {
          surat_jalan_item_id: { in: shipmentItemIds },
        },
        _sum: {
          qty: true,
        },
      })
    : [];

  const pickByItemId = new Map();
  for (const row of pickRows) {
    const itemId = Number(row.surat_jalan_item_id);
    if (!pickByItemId.has(itemId)) {
      pickByItemId.set(itemId, []);
    }
    pickByItemId.get(itemId).push({
      kondisi_diambil: row.kondisi_diambil,
      is_override: row.is_override,
      qty: row._sum.qty || 0,
    });
  }

  const pickSummaryByItemId = buildItemPickSummary(
    pickRows.map((r) => ({
      surat_jalan_item_id: r.surat_jalan_item_id,
      qty: r._sum.qty || 0,
      kondisi_diambil: r.kondisi_diambil,
    }))
  );

  const temuanPenerimaanByItem = new Map();
  for (const item of shipmentItems) {
    const itemId = Number(item.item_id);
    const qtyDiterima = item.qty_diterima != null ? Number(item.qty_diterima) : null;
    if (qtyDiterima === null) continue;

    const summary = pickSummaryByItemId.get(itemId) || { totalQty: 0, kondisiList: [] };
    const totalPick = summary.totalQty;
    const kondisiList = summary.kondisiList || [];
    const kondisiDiterima = item.kondisi_diterima || null;

    const qtyMatch = qtyDiterima === totalPick;
    const kondisiMatch = !kondisiDiterima || (kondisiList.length === 1 && kondisiList.some((k) => k.kondisi === kondisiDiterima));
    const hasMismatch = !qtyMatch || !kondisiMatch;

    temuanPenerimaanByItem.set(itemId, {
      qty_dipick_total: totalPick,
      qty_diterima: qtyDiterima,
      selisih_qty: qtyMatch ? 0 : qtyDiterima - totalPick,
      kondisi_diterima: kondisiDiterima,
      kondisi_diambil_list: kondisiList,
      is_kondisi_diambil: kondisiMatch,
      has_mismatch: hasMismatch,
      surat_jalan_status: item.surat_jalan?.status || null,
    });
  }

  const temuanPenerimaanSummaryByKey = new Map();
  for (const [itemId, temuan] of temuanPenerimaanByItem.entries()) {
    const key = itemIdToProjectBarangKey.get(itemId);
    if (!key) continue;
    const current = temuanPenerimaanSummaryByKey.get(key) || { jumlah_item_bertemuan_selisih: 0, total_selisih_qty: 0 };
    if (temuan.has_mismatch) {
      current.jumlah_item_bertemuan_selisih += 1;
      current.total_selisih_qty += Math.abs(temuan.selisih_qty || 0);
    }
    temuanPenerimaanSummaryByKey.set(key, current);
  }

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

  const laporanTiketSelect = isCluster
    ? {
        tiket: {
          select: {
            cluster_id: true,
            boq: {
              select: {
                cluster_id: true,
              },
            },
          },
        },
      }
    : {};

  const activeLaporans = await prisma.laporan_mitra.findMany({
    where: laporanWhere,
    select: {
      tiket_id: true,
      project_id: true,
      barang_id: true,
      nama_barang: true,
      used: true,
      ...laporanTiketSelect,
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
  const boqListByKey = new Map();

  if (isCluster) {
    const clusterIdsFromBoq = new Set();
    for (const item of boqItems) {
      const cid = item.boq?.cluster?.cluster_id;
      if (cid) clusterIdsFromBoq.add(cid);
    }

    const picByCluster = await buildClusterPicInfo(clusterIdsFromBoq);

    const latestPicMitraByCluster = new Map();
    const laporanWithCluster = activeLaporans.filter((l) => l.pic_mitra && l.pic_mitra.trim() !== "");
    const laporansByCluster = new Map();
    for (const laporan of laporanWithCluster) {
      const cid = resolveClusterId(null, null, laporan);
      if (!cid) continue;
      if (!laporansByCluster.has(cid)) {
        laporansByCluster.set(cid, []);
      }
      laporansByCluster.get(cid).push(laporan);
    }
    for (const [cid, laporans] of laporansByCluster.entries()) {
      const sorted = laporans.sort((a, b) => {
        const ta = a.tanggal_laporan ? new Date(a.tanggal_laporan).getTime() : 0;
        const tb = b.tanggal_laporan ? new Date(b.tanggal_laporan).getTime() : 0;
        return tb - ta;
      });
      latestPicMitraByCluster.set(cid, sorted[0].pic_mitra);
    }

    const clusterByItemId = new Map();
    const itemAttribution = new Map();
    for (const item of shipmentItems) {
      const itemId = Number(item.item_id);
      const cid = resolveClusterId(null, item, null, projectClusterMap);
      if (cid) {
        clusterByItemId.set(itemId, cid);
        itemAttribution.set(itemId, item.surat_jalan?.boq_id ? "boq" : "single_cluster");
      }
    }

    const inboundByClusterBarang = new Map();
    const outboundByClusterBarang = new Map();
    const additionalByClusterBarang = new Map();
    const mosByClusterBarang = new Map();
    const usedByClusterBarang = new Map();
    const unassignedByProjectBarang = new Map();

    for (const item of shipmentItems) {
      const itemId = Number(item.item_id);
      const clusterId = clusterByItemId.get(itemId);
      const projectIdNum = Number(item.surat_jalan?.project_id || 0);
      const barangId = String(item.barang_id);
      const qty = Number(item.qty || 0);

      if (clusterId) {
        const key = `${clusterId}-${barangId}`;

        if (item.surat_jalan?.tipe === "inbound") {
          if (item.is_kelebihan) {
            additionalByClusterBarang.set(key, (additionalByClusterBarang.get(key) || 0) + qty);
          } else {
            inboundByClusterBarang.set(key, (inboundByClusterBarang.get(key) || 0) + qty);
          }
        }

        if (item.surat_jalan?.tipe === "outbound" && item.surat_jalan?.tujuan_tipe !== "gudang") {
          outboundByClusterBarang.set(key, (outboundByClusterBarang.get(key) || 0) + qty);
          mosByClusterBarang.set(key, (mosByClusterBarang.get(key) || 0) + qty);
        }
      } else {
        const key = `unassigned-${projectIdNum}-${barangId}`;
        if (item.surat_jalan?.tipe === "inbound") {
          if (item.is_kelebihan) {
            additionalByClusterBarang.set(key, (additionalByClusterBarang.get(key) || 0) + qty);
          } else {
            inboundByClusterBarang.set(key, (inboundByClusterBarang.get(key) || 0) + qty);
          }
        }
        if (item.surat_jalan?.tipe === "outbound" && item.surat_jalan?.tujuan_tipe !== "gudang") {
          outboundByClusterBarang.set(key, (outboundByClusterBarang.get(key) || 0) + qty);
          mosByClusterBarang.set(key, (mosByClusterBarang.get(key) || 0) + qty);
        }
        unassignedByProjectBarang.set(key, (unassignedByProjectBarang.get(key) || 0) + 1);
      }
    }

    for (const laporan of activeLaporans) {
      const clusterId = resolveClusterId(null, null, laporan, projectClusterMap);
      if (!clusterId) continue;
      const barangId = laporan.barang_id ? String(laporan.barang_id) : null;
      if (!barangId) continue;
      const key = `${clusterId}-${barangId}`;
      const usedVal = Number(laporan.used || 0);
      usedByClusterBarang.set(key, (usedByClusterBarang.get(key) || 0) + usedVal);
    }

    for (const item of boqItems) {
      const tiket = item.boq?.tiket;
      const cluster = item.boq?.cluster;
      const clusterId = cluster?.cluster_id;
      if (!clusterId) continue;
      const barangId = String(item.barang_id);
      const key = `${clusterId}-${barangId}`;

      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, {
          project_id: String(tiket?.project?.project_id || ""),
          project_nama: tiket?.project?.nama_project || "-",
          cluster_id: clusterId,
          nama_cluster: cluster?.nama_cluster || "-",
          cluster_type: cluster?.cluster_type || null,
          project_type: cluster?.project_type || null,
          alamat_lengkap: cluster?.alamat_lengkap || null,
          kso_partner: cluster?.kso_partner || null,
          kso_contact: cluster?.kso_contact || null,
          no_tiket_release: cluster?.no_tiket_release || null,
          vendor: cluster?.vendor || null,
          homepass_plan: cluster?.homepass_plan ?? null,
          status_aktif: cluster?.status_aktif ?? null,
          area: cluster?.project?.area || tiket?.project?.area || "-",
          barang_id: barangId,
          kode_perangkat: item.barang?.kode_perangkat || "-",
          nama_barang: item.barang?.nama_barang || "-",
          satuan: item.satuan?.kode_satuan || "-",
          boq: 0,
          kode_tiket_list: [],
          cluster_attribution: "boq",
        });
        gudangByKey.set(key, new Set());
        satuanByKey.set(key, new Set());
        boqListByKey.set(key, []);
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

    // Add unassigned bucket for items that couldn't be attributed to any cluster
    for (const [key, count] of unassignedByProjectBarang.entries()) {
      const [, projectIdNum, barangId] = key.split("-");
      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, {
          project_id: projectIdNum,
          project_nama: "-",
          cluster_id: null,
          nama_cluster: "Belum ditentukan",
          cluster_type: null,
          project_type: null,
          alamat_lengkap: null,
          kso_partner: null,
          kso_contact: null,
          no_tiket_release: null,
          vendor: null,
          homepass_plan: null,
          status_aktif: null,
          area: "-",
          barang_id: barangId,
          kode_perangkat: "-",
          nama_barang: "-",
          satuan: "-",
          boq: 0,
          kode_tiket_list: [],
          cluster_attribution: "unassigned",
        });
        gudangByKey.set(key, new Set());
        satuanByKey.set(key, new Set());
        boqListByKey.set(key, []);
      }
    }

    const approvedReturnByClusterBarang = new Map();
    for (const agg of aggregatedMap.values()) {
      if (!agg.cluster_id) continue;
      const clusterId = agg.cluster_id;
      const barangId = String(agg.barang_id);
      const key = `${clusterId}-${barangId}`;

      const clusterTickets = new Set();
      for (const item of boqItems) {
        const tiket = item.boq?.tiket;
        const cluster = item.boq?.cluster;
        if (cluster?.cluster_id === clusterId) {
          clusterTickets.add(tiket.tiket_id);
        }
      }

      let totalApprovedQty = 0;
      for (const tiketId of clusterTickets) {
        const { snapshot } = await getLatestPhysicalSnapshot(tiketId, barangId);
        if (!snapshot) continue;
        const qty = await getApprovedReturnsAfterSnapshot(tiketId, barangId, snapshot.tanggal_laporan);
        totalApprovedQty += Number(qty);
      }

      approvedReturnByClusterBarang.set(key, totalApprovedQty);
    }

    if (clusterId !== "all") {
      for (const [key] of aggregatedMap) {
        const isUnassigned = key.startsWith("unassigned-");
        if (clusterId === "unassigned") {
          if (!isUnassigned) {
            aggregatedMap.delete(key);
          }
        } else {
          if (isUnassigned) {
            aggregatedMap.delete(key);
          } else {
            const [cid] = key.split("-");
            if (cid !== clusterId) {
              aggregatedMap.delete(key);
            }
          }
        }
      }
    }

    if (isCluster) {
      for (const [key] of aggregatedMap) {
        if (key.startsWith("unassigned-")) {
          aggregatedMap.delete(key);
        }
      }
    }

    const temuanPenerimaanByClusterKey = new Map();
    for (const [itemId, temuan] of temuanPenerimaanByItem.entries()) {
      const clusterKey = itemIdToClusterBarangKey.get(itemId);
      if (!clusterKey) continue;
      const current = temuanPenerimaanByClusterKey.get(clusterKey) || { jumlah_item_bertemuan_selisih: 0, total_selisih_qty: 0 };
      if (temuan.has_mismatch) {
        current.jumlah_item_bertemuan_selisih += 1;
        current.total_selisih_qty += Math.abs(temuan.selisih_qty || 0);
      }
      temuanPenerimaanByClusterKey.set(clusterKey, current);
    }

    let rows = Array.from(aggregatedMap.values()).map((agg) => {
      const isUnassigned = agg.cluster_id === null && agg.nama_cluster === "Belum ditentukan";
      const key = isUnassigned ? `unassigned-${agg.project_id}-${agg.barang_id}` : `${agg.cluster_id}-${agg.barang_id}`;
      const additional = Number(additionalByClusterBarang.get(key) || 0);
      const mos = Number(mosByClusterBarang.get(key) || 0);
      const used = Number(usedByClusterBarang.get(key) || 0);
      const approvedReturnQty = Number(approvedReturnByClusterBarang.get(key) || 0);
      const remains = computeRemains(mos, agg.boq, additional, used, approvedReturnQty);
      const recStatus = computeReconciliationStatus(remains);

      const uniqueTikets = [...new Set(agg.kode_tiket_list)].filter(Boolean);
      const kodeTiketStr = uniqueTikets.join(", ") || "-";
      const gudangList = [...(gudangByKey.get(key) || [])];
      const gudangNama = gudangList.join(", ") || "-";
      const satuanList = [...(satuanByKey.get(key) || [])];
      const satuanStr = satuanList.join(", ") || "-";

      const pickItemIds = [];
      for (const [itemId, clusterBarangKey] of itemIdToClusterBarangKey.entries()) {
        if (clusterBarangKey === key) {
          pickItemIds.push(itemId);
        }
      }

      const allPickRows = [];
      for (const itemId of pickItemIds) {
        const itemRows = pickByItemId.get(itemId) || [];
        for (const r of itemRows) {
          allPickRows.push({
            surat_jalan_item_id: itemId,
            kondisi_diambil: r.kondisi_diambil,
            is_override: r.is_override,
            qty: r.qty,
          });
        }
      }

      const sjQty = pickItemIds.reduce((sum, itemId) => {
        const item = shipmentItems.find((si) => Number(si.item_id) === itemId);
        return sum + Number(item?.qty || 0);
      }, 0);

      const pickSummary = buildPickSummary(allPickRows, sjQty);

      const boqList = (boqListByKey.get(key) || []).map((entry) => ({
        boq_id: entry.boq_id,
        kode_boq: entry.kode_boq,
        status: entry.status,
      }));
      const adaBoqSelesai = boqList.some((entry) => entry.status === "selesai");

      const picInfo = isUnassigned ? null : picByCluster.get(agg.cluster_id);
      const picNama = isUnassigned ? "-" : (picInfo?.nama || latestPicMitraByCluster.get(agg.cluster_id) || null);
      const picSumber = isUnassigned ? null : (picInfo?.sumber || (latestPicMitraByCluster.get(agg.cluster_id) ? "mitra" : null));

      return {
        id: key,
        project_id: agg.project_id,
        project_nama: agg.project_nama,
        cluster_id: agg.cluster_id,
        nama_cluster: agg.nama_cluster,
        cluster_type: agg.cluster_type,
        project_type: agg.project_type,
        alamat_lengkap: agg.alamat_lengkap,
        kso_partner: agg.kso_partner,
        kso_contact: agg.kso_contact,
        no_tiket_release: agg.no_tiket_release,
        vendor: agg.vendor,
        homepass_plan: agg.homepass_plan,
        status_aktif: agg.status_aktif,
        pic_nama: picNama,
        pic_sumber: picSumber,
        cluster_attribution: agg.cluster_attribution || (isUnassigned ? "unassigned" : null),
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
        boq_list: boqList,
        ada_boq_selesai: adaBoqSelesai,
        ...pickSummary,
        temuan_penerimaan: temuanPenerimaanByClusterKey.get(key) || null,
      };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((row) => [row.project_nama, row.cluster_id, row.nama_cluster, row.kode_tiket, row.kode_perangkat, row.nama_barang, row.gudang_nama].join(" ").toLowerCase().includes(q));
    }

    if (status !== "all") {
      rows = rows.filter((row) => row.status === status);
    }

    return { data: rows };
  }

  // Project mode
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
      const cluster = item.boq?.cluster;
      const clusterId = cluster?.cluster_id || tiketProject?.cluster_id || "-";
      const area = clusterProject?.area || tiketProject?.area || "-";

      aggregatedMap.set(key, {
        project_id: String(projectIdNum),
        project_nama: tiketProject?.nama_project || "-",
        cluster_id: clusterId,
        nama_cluster: cluster?.nama_cluster || "-",
        cluster_type: cluster?.cluster_type || null,
        project_type: cluster?.project_type || null,
        alamat_lengkap: cluster?.alamat_lengkap || null,
        kso_partner: cluster?.kso_partner || null,
        kso_contact: cluster?.kso_contact || null,
        no_tiket_release: cluster?.no_tiket_release || null,
        vendor: cluster?.vendor || null,
        homepass_plan: cluster?.homepass_plan ?? null,
        status_aktif: cluster?.status_aktif ?? null,
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
      boqListByKey.set(key, []);
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

    const pickItemIds = [];
    for (const [itemId, projectBarangKey] of itemIdToProjectBarangKey.entries()) {
      if (projectBarangKey === key) {
        pickItemIds.push(itemId);
      }
    }

    const allPickRows = [];
    for (const itemId of pickItemIds) {
      const itemRows = pickByItemId.get(itemId) || [];
      for (const r of itemRows) {
        allPickRows.push({
          surat_jalan_item_id: itemId,
          kondisi_diambil: r.kondisi_diambil,
          is_override: r.is_override,
          qty: r.qty,
        });
      }
    }

    const sjQty = pickItemIds.reduce((sum, itemId) => {
      const item = shipmentItems.find((si) => Number(si.item_id) === itemId);
      return sum + Number(item?.qty || 0);
    }, 0);

    const pickSummary = buildPickSummary(allPickRows, sjQty);

    const boqList = (boqListByKey.get(key) || []).map((entry) => ({
      boq_id: entry.boq_id,
      kode_boq: entry.kode_boq,
      status: entry.status,
    }));
    const adaBoqSelesai = boqList.some((entry) => entry.status === "selesai");

    return {
      id: key,
      project_id: agg.project_id,
      project_nama: agg.project_nama,
      cluster_id: agg.cluster_id,
      nama_cluster: agg.nama_cluster || null,
      cluster_type: agg.cluster_type || null,
      project_type: agg.project_type || null,
      alamat_lengkap: agg.alamat_lengkap || null,
      kso_partner: agg.kso_partner || null,
      kso_contact: agg.kso_contact || null,
      no_tiket_release: agg.no_tiket_release || null,
      vendor: agg.vendor || null,
      homepass_plan: agg.homepass_plan ?? null,
      status_aktif: agg.status_aktif ?? null,
      pic_nama: null,
      pic_sumber: null,
      cluster_attribution: null,
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
      boq_list: boqList,
      ada_boq_selesai: adaBoqSelesai,
      ...pickSummary,
      temuan_penerimaan: (temuanPenerimaanSummaryByKey.get(key) || null),
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
