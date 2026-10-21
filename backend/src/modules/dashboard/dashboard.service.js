const dashboardRepository = require("./dashboard.repository");
const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");
const reconciliationUtils = require("../reconciliation/reconciliation.utils");
const { isMosEligibleInbound } = require("../reconciliation/reconciliation.utils");
const returnRepository = require("../return/return.repository");
const { getApprovedReturnsAfterSnapshot, getLatestPhysicalSnapshot } = returnRepository;
const additionalRepository = require("../additional/additional.repository");

const getStats = async (actor = null) => {
  return await dashboardRepository.getStats(actor);
};

const getProjectSummary = async () => {
  return await dashboardRepository.getProjectSummary();
};

const getApprovalQueue = async (actor) => {
  const role = actor?.role || "staff";
  const userId = Number(actor?.id || 0);

  const whereInbound = {
    status: { in: ["menunggu_verifikasi"] },
    tipe: "inbound",
  };

  const whereOutbound = {
    status: { in: ["draft_diajukan"] },
    tipe: "outbound",
  };

  const whereVerification = {
    OR: [
      { status: "menunggu_verifikasi", tipe: "inbound" },
      { status: "draft_diajukan", tipe: "outbound" },
    ],
  };

  const whereDiscrepancy = {
    status: { in: ["ditolak", "draft_diajukan"] },
  };

  const [
    inboundMenunggu,
    outboundMenunggu,
    verifikasiMenunggu,
    discrepancyMenunggu,
    permintaanBoqMenunggu,
  ] = await Promise.all([
    prisma.surat_jalan.count({ where: whereInbound }),
    prisma.surat_jalan.count({ where: whereOutbound }),
    prisma.surat_jalan.count({ where: whereVerification }),
    prisma.surat_jalan.count({ where: whereDiscrepancy }),
    prisma.permintaan_boq.count({ where: { status: "diajukan" } }),
  ]);

  const inboundList = await prisma.surat_jalan.findMany({
    where: whereInbound,
    take: 5,
    orderBy: { created_at: "asc" },
    select: {
      surat_jalan_id: true,
      nomor_surat_jalan: true,
      tipe: true,
      status: true,
      created_at: true,
      pic_pemohon_nama: true,
      project: { select: { nama_project: true, area: true } },
      gudang_tujuan: { select: { nama_gudang: true } },
      items: {
        select: {
          qty: true,
          barang: {
            include: {
              kategori: {
                select: {
                  kategori_id: true,
                  nama_kategori: true,
                  is_kritis: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const outboundList = await prisma.surat_jalan.findMany({
    where: whereOutbound,
    take: 5,
    orderBy: { created_at: "asc" },
    select: {
      surat_jalan_id: true,
      nomor_surat_jalan: true,
      tipe: true,
      status: true,
      created_at: true,
      pic_pemohon_nama: true,
      project: { select: { nama_project: true, area: true } },
      gudang_tujuan: { select: { nama_gudang: true } },
      items: {
        select: {
          qty: true,
          barang: {
            include: {
              kategori: {
                select: {
                  kategori_id: true,
                  nama_kategori: true,
                  is_kritis: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const verificationList = await prisma.surat_jalan.findMany({
    where: whereVerification,
    take: 5,
    orderBy: { created_at: "asc" },
    select: {
      surat_jalan_id: true,
      nomor_surat_jalan: true,
      tipe: true,
      status: true,
      created_at: true,
      pic_pemohon_nama: true,
      project: { select: { nama_project: true, area: true } },
      gudang_tujuan: { select: { nama_gudang: true } },
      items: {
        select: {
          qty: true,
          barang: {
            include: {
              kategori: {
                select: {
                  kategori_id: true,
                  nama_kategori: true,
                  is_kritis: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const formatApproval = (records, type) =>
    records.map((r) => {
      const totalQty = r.items.reduce((sum, it) => sum + Number(it.qty || 0), 0);
      const isKritis = r.items.some((it) => it.barang?.kategori?.is_kritis === true);
      return {
        id: String(r.surat_jalan_id),
        nomorSuratJalan: r.nomor_surat_jalan,
        type,
        direction: r.tipe,
        status: r.status,
        partner: r.pic_pemohon_nama || r.project?.nama_project || "-",
        projectName: r.project?.nama_project || "-",
        area: r.project?.area || "-",
        warehouse: r.gudang_tujuan?.nama_gudang || "-",
        totalQty,
        isKritis,
        createdAt: r.created_at,
      };
    });

  return {
    inboundCount: inboundMenunggu,
    outboundCount: outboundMenunggu,
    verificationCount: verifikasiMenunggu,
    discrepancyCount: discrepancyMenunggu,
    permintaanBoqCount: permintaanBoqMenunggu,
    items: [
      ...formatApproval(inboundList, "inbound_verifikasi"),
      ...formatApproval(outboundList, "outbound_approval"),
      ...formatApproval(verificationList, "verifikasi_sj"),
    ],
  };
};

const getHardwareReconciliation = async (filters = {}) => {
  // 2026-09-05 revert: scoping supervisor per-gudang dihapus. Supervisor setara
  // admin — bisa melihat semua gudang (sama dengan behavior sebelum Gelombang 2.3).
  const { warehouseId = "all", projectId = "all", search = "" } = filters;

  const whereBoq = {
    boq: { status: { in: ["aktif", "selesai"] } },
  };

  if (warehouseId !== "all") {
    whereBoq.gudang_tujuan_id = BigInt(warehouseId);
  }

  if (projectId !== "all") {
    whereBoq.boq.cluster = { project_id: BigInt(projectId) };
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
              mos: true,
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
        select: { kode_satuan: true },
      },
      gudang_tujuan: {
        select: { nama_gudang: true },
      },
    },
  });

  const shipmentWhere = {
    surat_jalan: { status: { in: ["disetujui", "diterima_didistribusikan"] } },
  };

  if (projectId !== "all") {
    shipmentWhere.surat_jalan.project_id = BigInt(projectId);
  }

  // Query outbound items (existing)
  const outboundShipmentItems = await prisma.surat_jalan_item.findMany({
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

  // Query inbound items with approved statuses
  const inboundShipmentWhere = {
    surat_jalan: {
      status: { in: ["ready_putaway", "disetujui", "diterima_didistribusikan"] },
      tipe: "inbound",
    },
  };

  if (projectId !== "all") {
    inboundShipmentWhere.surat_jalan.project_id = BigInt(projectId);
  }

  const inboundShipmentItems = await prisma.surat_jalan_item.findMany({
    where: inboundShipmentWhere,
    include: {
      surat_jalan: {
        select: {
          tipe: true,
          project_id: true,
          cluster_id: true,
          tipe_pengirim: true,
          gudang_asal_id: true,
          gudang_tujuan_id: true,
          boq_id: true,
          tujuan_tipe: true,
        },
      },
    },
  });

  const outboundByProjectBarang = new Map();
  const additionalByProjectBarang = new Map();
  const inboundMosByProjectBarang = new Map();

  const projectIdsForAdditional =
    projectId !== "all"
      ? [BigInt(projectId)]
      : Array.from(
          new Set(
            outboundShipmentItems
              .map((item) => item.surat_jalan?.project_id)
              .filter((id) => id != null)
          )
        );

  const additionalTotalsByProject =
    projectIdsForAdditional.length > 0
      ? await additionalRepository.getAdditionalTotalsByProject(
          projectIdsForAdditional.map((id) => Number(id))
        )
      : new Map();

  // Build inbound MOS map using isMosEligibleInbound
  for (const item of inboundShipmentItems) {
    const projectIdNum = Number(item.surat_jalan?.project_id);
    const barangId = String(item.barang_id);
    const qty = Number(item.qty || 0);
    const key = `${projectIdNum}-${barangId}`;

    if (isMosEligibleInbound(item.surat_jalan)) {
      inboundMosByProjectBarang.set(key, (inboundMosByProjectBarang.get(key) || 0) + qty);
    }
  }

  // Build outbound map (for Used/other calculations, NOT for MOS)
  for (const item of outboundShipmentItems) {
    const projectIdNum = Number(item.surat_jalan?.project_id);
    const barangId = String(item.barang_id);
    const qty = Number(item.qty || 0);
    const key = `${projectIdNum}-${barangId}`;

    if (item.surat_jalan?.tipe === "outbound" && item.surat_jalan?.tujuan_tipe !== "gudang") {
      outboundByProjectBarang.set(key, (outboundByProjectBarang.get(key) || 0) + qty);
    }
  }

  // MOS = inbound only (external vendor inbound)
  const mosByProjectBarang = inboundMosByProjectBarang;

  for (const [key, val] of additionalTotalsByProject) {
    additionalByProjectBarang.set(key, (additionalByProjectBarang.get(key) || 0) + val);
  }

  const aggregatedMap = new Map();
  const gudangByKey = new Map();
  const satuanByKey = new Map();
  const usedByProjectBarang = new Map();

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

  for (const [ticketBarangKey, laporanUsed] of laporanUsedByTicketBarang.entries()) {
    if (laporanUsed <= 0) continue;

    const projectIdNum = ticketProjectMap.get(ticketBarangKey) || "0";
    const [, barangId] = ticketBarangKey.split("-");
    const projectBarangKey = `${projectIdNum}-${barangId}`;

    usedByProjectBarang.set(projectBarangKey, (usedByProjectBarang.get(projectBarangKey) || 0) + laporanUsed);
  }

  for (const item of boqItems) {
    const tiket = item.boq?.tiket;
    const project = tiket?.project;
    const projectIdNum = Number(project?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;

    if (!aggregatedMap.has(key)) {
      const tiket = item.boq?.tiket;
      const tiketProject = tiket?.project;
      const clusterProject = item.boq?.cluster?.project;
      const clusterId = clusterProject?.cluster_id || tiketProject?.cluster_id || "-";
      const area = clusterProject?.area || tiketProject?.area || "-";

      aggregatedMap.set(key, {
        project_id: String(projectIdNum),
        project_nama: project?.nama_project || "-",
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
      if (Number(project?.project_id || 0) === projectIdNum && tiket?.tiket_id) {
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
    const remains = reconciliationUtils.computeRemains(mos, agg.boq, additional);

    const recStatus = reconciliationUtils.computeReconciliationStatus(
      remains,
      agg.boq
    );

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
    rows = rows.filter((row) =>
      [row.project_nama, row.kode_tiket, row.kode_perangkat, row.nama_barang, row.gudang_nama]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  return { data: rows };
};

const getActivityLog = async (filters = {}) => {
  const { limit = 20, search = "" } = filters;

  const where = {};
  if (search.trim()) {
    where.OR = [
      { aksi: { contains: search } },
      { entity_type: { contains: search } },
    ];
  }

  const logs = await prisma.audit_log.findMany({
    where,
    take: Number(limit) || 20,
    orderBy: { created_at: "desc" },
    include: {
      actor: {
        select: {
          nama: true,
          email: true,
        },
      },
    },
  });

  return logs.map((log) => ({
    auditId: String(log.audit_id),
    entityType: log.entity_type,
    entityId: String(log.entity_id),
    action: log.aksi,
    actorName: log.actor?.nama || log.actor?.email || "System",
    dataBefore: log.data_sebelum,
    dataAfter: log.data_sesudah,
    createdAt: log.created_at,
  }));
};

const getWarehouseAssessment = async (filters = {}) => {
  // 2026-09-05 revert: scoping supervisor per-gudang dihapus.
  const { gudangId = "all" } = filters;

  const where = {};
  if (gudangId !== "all") {
    where.gudang_id = BigInt(gudangId);
  }

  const zonas = await prisma.zona_gudang.findMany({
    where,
    include: {
      gudang: {
        select: {
          gudang_id: true,
          nama_gudang: true,
          tipe: true,
          kapasitas_maksimum: true,
          project: {
            select: {
              project_id: true,
              nama_project: true,
              area: true,
            },
          },
        },
      },
      dinilai_oleh_user: {
        select: {
          nama: true,
          email: true,
        },
      },
    },
    orderBy: [{ gudang_id: "asc" }, { kode_zona: "asc" }],
  });

  // Untuk setiap zona: hitung SUM(qty) di zona tersebut (on-the-fly).
  // Jika ada zona, batch aggregate via groupBy untuk performa.
  const zonaIds = zonas.map((z) => z.zona_id);
  let qtyByZona = new Map();
  if (zonaIds.length > 0) {
    const grouped = await prisma.stok_gudang.groupBy({
      by: ["zona_id"],
      where: { zona_id: { in: zonaIds } },
      _sum: { qty: true },
    });
    for (const g of grouped) {
      qtyByZona.set(Number(g.zona_id), Number(g._sum.qty || 0));
    }
  }

  return zonas.map((z) => {
    const kapasitas = z.kapasitas_maksimum;
    const qty = qtyByZona.get(Number(z.zona_id)) || 0;
    const sisa = kapasitas != null ? kapasitas - qty : null;
    return {
      zonaId: String(z.zona_id),
      gudangId: String(z.gudang_id),
      gudangNama: z.gudang?.nama_gudang || "-",
      gudangTipe: z.gudang?.tipe || "-",
      gudangKapasitasMaksimum: z.gudang?.kapasitas_maksimum ?? null,
      projectNama: z.gudang?.project?.nama_project || "-",
      area: z.gudang?.project?.area || "-",
      kodeZona: z.kode_zona,
      namaZona: z.nama_zona || z.kode_zona,
      kapasitasMaksimum: kapasitas,
      totalQty: qty,
      sisa, // null = kapasitas belum diatur
      statusKecukupan: z.status_kecukupan || "CUKUP",
      statusKecukupanSource: z.status_kecukupan_source || "AUTO",
      kapasitasBelumDiatur: kapasitas == null,
      dinilaiOleh: z.dinilai_oleh_user?.nama || z.dinilai_oleh_user?.email || null,
      dinilaiPada: z.dinilai_pada || null,
    };
  });
};

// @deprecated since 2026-09-05 (Gelombang 3 task) — bulk override gudang ini
// akan dihapus setelah Gelombang 4 frontend selesai migrasi ke per-zona PATCH.
// Pengganti: zone.service.updateUtilizationStatus() dipanggil via
// PATCH /api/zones/:zona_id/utilization-status (lebih presisi, sesuai dengan
// satu zona yang sedang dinilai supervisor — bukan memaksakan status yang
// sama ke seluruh zona di gudang).
const updateWarehouseAssessment = async (gudangId, body, actor) => {
  const { status_kecukupan, catatan } = body;

  if (!["CUKUP", "MENDEKATI_PENUH", "TIDAK_CUKUP"].includes(status_kecukupan)) {
    throw new AppError("Status kecukupan tidak valid.", 400);
  }

  const userId = BigInt(actor?.id || 0);

  if (gudangId && gudangId !== "all") {
    const updated = await prisma.zona_gudang.updateMany({
      where: { gudang_id: BigInt(gudangId) },
      data: {
        status_kecukupan,
        dinilai_oleh: userId,
        dinilai_pada: new Date(),
      },
    });

    if (updated.count > 0 && catatan) {
      const zonas = await prisma.zona_gudang.findMany({
        where: { gudang_id: BigInt(gudangId) },
        select: { zona_id: true },
      });

      for (const zona of zonas) {
        await prisma.zona_utilisasi_log.create({
          data: {
            zona_id: zona.zona_id,
            status: status_kecukupan,
            diperbarui_oleh: userId,
            catatan: catatan || null,
          },
        });
      }
    }

    return { gudangId, status_kecukupan, updatedCount: updated.count };
  }

  throw new AppError("Gudang ID wajib diisi.", 400);
};

module.exports = {
  getStats,
  getProjectSummary,
  getApprovalQueue,
  getHardwareReconciliation,
  getActivityLog,
  getWarehouseAssessment,
  updateWarehouseAssessment,
};
