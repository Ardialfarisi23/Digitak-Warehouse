const prisma = require("../../config/prisma");
const reconciliationRepository = require("../reconciliation/reconciliation.repository");
const reconciliationUtils = require("../reconciliation/reconciliation.utils");
const capacityService = require("../capacity/capacity.service");

const safeCount = async (modelName, fallback = 0) => {
  const model = prisma[modelName];

  if (!model || typeof model.count !== "function") {
    return fallback;
  }

  return await model.count();
};

/**
 * Hitung data kapasitas per gudang (on-the-fly, TIDAK menulis ke DB).
 * Digunakan oleh getStats() dan endpoint lain yang butuh ringkasan per-gudang.
 *
 * @param {BigInt[]|number[]|string[]} gudangIds  daftar gudang yang akan dihitung
 * @returns {Promise<Array<{gudang_id, nama_gudang, tipe, kapasitas_maksimum, total_qty, sisa, status, total_zona, total_zona_dengan_kapasitas}>>}
 */
const getCapacityPerGudang = async (gudangIds) => {
  if (!Array.isArray(gudangIds) || gudangIds.length === 0) return [];

  const gList = await prisma.gudang.findMany({
    where: { gudang_id: { in: gudangIds.map((x) => BigInt(x)) } },
    select: {
      gudang_id: true,
      nama_gudang: true,
      tipe: true,
      kapasitas_maksimum: true,
    },
    orderBy: { nama_gudang: "asc" },
  });

  const result = [];
  for (const g of gList) {
    const gid = Number(g.gudang_id);

    // Total qty non-generic (zona_id != null) — stok yang benar-benar di zona
    const sumNonGeneric = await prisma.stok_gudang.aggregate({
      where: { gudang_id: gid, zona_id: { not: null } },
      _sum: { qty: true },
    });
    // Total qty generic (zona_id = null) — stok yang sudah masuk gudang tapi belum di-putaway
    const sumGeneric = await prisma.stok_gudang.aggregate({
      where: { gudang_id: gid, zona_id: null },
      _sum: { qty: true },
    });

    // Agregasi status gudang = worst-case dari zona-zonanya
    const agg = await capacityService.aggregateWarehouseStatus(prisma, gid);

    // Untuk SISA, prioritas: kapasitas gudang (kalau ada) → fallback ke total zona
    const gudangKapasitas = g.kapasitas_maksimum;
    const totalQty = Number(sumNonGeneric._sum.qty || 0);
    const sisaGudang = gudangKapasitas != null ? gudangKapasitas - totalQty : null;

    // Hitung jumlah zona + zona yang punya kapasitas terisi (untuk FE menampilkan
    // "Kapasitas belum diatur" per gudang)
    const zonaStats = await prisma.zona_gudang.groupBy({
      by: ["zona_id"],
      where: { gudang_id: gid },
      _count: { _all: true },
    });
    // groupBy di Prisma tidak bisa count distinct condition; pakai findMany distinct
    const zonas = await prisma.zona_gudang.findMany({
      where: { gudang_id: gid },
      select: { kapasitas_maksimum: true },
    });
    const totalZona = zonas.length;
    const totalZonaDenganKapasitas = zonas.filter((z) => z.kapasitas_maksimum != null).length;

    result.push({
      gudang_id: String(g.gudang_id),
      nama_gudang: g.nama_gudang,
      tipe: g.tipe,
      kapasitas_maksimum: gudangKapasitas,
      total_qty_di_zona: totalQty,
      total_qty_generic: Number(sumGeneric._sum.qty || 0),
      sisa: sisaGudang,
      status: agg.status,
      total_zona: totalZona,
      total_zona_dengan_kapasitas: totalZonaDenganKapasitas,
    });
  }
  return result;
};

const getStats = async (actor = null) => {
  // 2026-09-05 revert: scoping supervisor per-gudang dihapus (misinterpretasi
  // requirement). Supervisor setara admin — return data untuk semua gudang.
  // Parameter `actor` disimpan untuk konsistensi signature & kebutuhan masa depan.
  void actor;
  const [totalItems, activeBoq, pendingShipments, pendingApprovals, activeProjects] =
    await Promise.all([
      safeCount("barang"),
      prisma.boq.count({ where: { status: "aktif" } }),
      prisma.surat_jalan.count({
        where: {
          status: {
            in: ["draft_diajukan", "disetujui", "digenerate"],
          },
        },
      }),
      prisma.approval_log.count({ where: { status: "menunggu" } }),
      prisma.project.count({ where: { status_aktif: true } }),
    ]);

  const allGudangIds = (await prisma.gudang.findMany({ select: { gudang_id: true } }))
    .map((x) => Number(x.gudang_id));

  // Hitung on-the-fly (TIDAK tulis ke kolom status_kecukupan_gudang).
  const kapasitasPerGudang = await getCapacityPerGudang(allGudangIds);

  return {
    warehouses: allGudangIds.length,
    personnels: await safeCount("personil"),
    aisles: await safeCount("zona_gudang"),
    categories: await safeCount("kategori_barang"),
    customers: await safeCount("customer"),
    items: totalItems,
    totalItems,
    projects: activeProjects,
    activeBoq,
    pendingShipments,
    pendingApprovals,
    suppliers: await safeCount("supplier"),
    units: await safeCount("satuan"),
    vehicles: await safeCount("kendaraan"),
    zones: await safeCount("zona_gudang"),
    kapasitas_per_gudang: kapasitasPerGudang,
  };
};

const getProjectSummary = async () => {
  const projects = await prisma.project.findMany({
    where: {
      status_aktif: true,
    },
    orderBy: [{ area: "asc" }, { nama_project: "asc" }],
    select: {
      project_id: true,
      nama_project: true,
      title: true,
      cluster_id: true,
      area: true,
    },
  });

  const boqStatusByProject = new Map();

  const boqRecords = await prisma.boq.findMany({
    where: {
      status: { in: ["draft", "aktif", "selesai"] },
    },
    include: {
      tiket: {
        select: {
          project_id: true,
        },
      },
    },
  });

  for (const boq of boqRecords) {
    const projectId = Number(boq.tiket?.project_id);
    if (!projectId) continue;

    if (boq.status === "aktif") {
      boqStatusByProject.set(projectId, "Aktif");
      continue;
    }

    if (!boqStatusByProject.has(projectId)) {
      boqStatusByProject.set(projectId, "Draft");
    }
  }

  // --- Aggregasi 5 metric per-project ---
  // Delegate ke reconciliation.repository.getInventory agar nilai di dashboard PERSIS
  // SAMA PERSIS dengan halaman /dashboard/reconciliation (verifikasi konsistensi angka).
  // Data yang dikembalikan adalah per-barang-per-project (sudah termasuk field `status`
  // per-barang dan `remains` yang dihitung pakai rumus canonical). Agregasi ke level
  // project — termasuk penentuan status "perhatian"/"sesuai"/"berjalan" — dilakukan
  // di bawah dengan bantuan reconciliationUtils.aggregateProjectStatus().
  const reconResult = await reconciliationRepository.getInventory({}, null);
  const reconRows = Array.isArray(reconResult?.data) ? reconResult.data : [];

  const projectAggregates = new Map();
  for (const row of reconRows) {
    const pid = String(row.project_id);
    if (!pid || pid === "0") continue;

    if (!projectAggregates.has(pid)) {
      projectAggregates.set(pid, {
        boq: 0,
        additional: 0,
        mos_sistem: 0,
        used: 0,
        remains: 0,
        statuses: [],
      });
    }

    const agg = projectAggregates.get(pid);
    agg.boq += Number(row.boq || 0);
    agg.additional += Number(row.additional || 0);
    agg.mos_sistem += Number(row.mos_sistem || 0);
    agg.used += Number(row.used || 0);
    agg.remains += Number(row.remains || 0);
    if (row.status) agg.statuses.push(row.status);
  }

  return projects.map((project) => {
    const projectId = Number(project.project_id);
    const projectName = project.title || project.nama_project || "Project";
    const statusBoq = boqStatusByProject.get(projectId) || "Belum Ada";

    const agg = projectAggregates.get(String(projectId)) || null;

    const boq = agg ? Number(agg.boq) || 0 : 0;
    const additional = agg ? Number(agg.additional) || 0 : 0;
    const mosSistem = agg ? Number(agg.mos_sistem) || 0 : 0;
    const used = agg ? Number(agg.used) || 0 : 0;
    const remains = agg ? reconciliationUtils.computeRemains(mosSistem, boq, additional) : 0;
    const reconStatus = agg
      ? reconciliationUtils.aggregateProjectStatus(agg.statuses)
      : "berjalan";

    // Legacy alias — agar hardwareOnSite konsisten dengan MOS Sistem yang baru.
    const hardwareOnSite = mosSistem;

    const progress =
      mosSistem > 0
        ? Math.min(Math.round((used / mosSistem) * 100), 100)
        : 0;

    return {
      projectId,
      projectName,
      clusterId: project.cluster_id || null,
      clusterLabel: project.cluster_id ? `RW ${project.cluster_id}` : "-",
      area: project.area || "-",
      statusBoq,
      hardwareOnSite,
      mos_sistem: mosSistem,
      boq,
      additional,
      used,
      remains,
      status: reconStatus,
      progress,
    };
  });
};

module.exports = {
  getStats,
  getProjectSummary,
  getCapacityPerGudang,
};

