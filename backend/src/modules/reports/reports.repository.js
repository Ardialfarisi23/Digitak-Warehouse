const prisma = require("../../config/prisma");

const getStockHistory = async (filters = {}) => {
  const {
    search = "",
    projectId = "all",
    warehouseId = "all",
    type = "all",
    status = "all",
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = filters;

  const where = {};

  if (search.trim()) {
    const s = search.trim();
    where.OR = [
      { barang: { nama_barang: { contains: s, mode: "insensitive" } } },
      { barang: { kode_perangkat: { contains: s, mode: "insensitive" } } },
      {
        surat_jalan_item: {
          surat_jalan: {
            OR: [
              { nomor_surat_jalan: { contains: s, mode: "insensitive" } },
              {
                boq: {
                  tiket: {
                    kode_tiket: { contains: s, mode: "insensitive" },
                  },
                },
              },
            ],
          },
        },
      },
    ];
  }

  const suratJalanWhere = {};
  if (projectId !== "all") {
    suratJalanWhere.project_id = BigInt(projectId);
  }
  if (type !== "all") {
    suratJalanWhere.tipe = type;
  }
  if (status !== "all") {
    suratJalanWhere.status = status;
  }

  if (Object.keys(suratJalanWhere).length > 0) {
    where.surat_jalan_item = { surat_jalan: suratJalanWhere };
  }

  if (warehouseId !== "all") {
    const w = where.surat_jalan_item || {};
    const sj = w.surat_jalan || {};
    sj.OR = sj.OR || [];
    sj.OR.push(
      { gudang_asal_id: BigInt(warehouseId) },
      { gudang_tujuan_id: BigInt(warehouseId) }
    );
    where.surat_jalan_item = { ...w, surat_jalan: sj };
  }

  if (startDate || endDate) {
    where.waktu_mutasi = {};
    if (startDate) where.waktu_mutasi.gte = new Date(startDate);
    if (endDate) where.waktu_mutasi.lte = new Date(endDate + "T23:59:59");
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.stok_ledger.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { waktu_mutasi: "desc" },
      include: {
        surat_jalan_item: {
          include: {
            surat_jalan: {
              include: {
                project: {
                  select: {
                    nama_project: true,
                    area: true,
                  },
                },
                gudang_asal: {
                  select: {
                    nama_gudang: true,
                  },
                },
                gudang_tujuan: {
                  select: {
                    nama_gudang: true,
                  },
                },
                boq: {
                  include: {
                    tiket: {
                      select: {
                        tiket_id: true,
                        kode_tiket: true,
                      },
                    },
                  },
                },
                creator: {
                  select: {
                    nama: true,
                    role: true,
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
          },
        },
      },
    }),

    prisma.stok_ledger.count({ where }),
  ]);

  const rows = data.map((ledger) => {
    const item = ledger.surat_jalan_item;
    const suratJalan = item?.surat_jalan;
    const barang = item?.barang;
    const tiket = suratJalan?.boq?.tiket;

    return {
      ledger_id: String(ledger.ledger_id),
      waktu_mutasi: ledger.waktu_mutasi,
      jenis_mutasi: ledger.jenis_mutasi,
      qty: Number(ledger.qty),
      saldo_setelah: Number(ledger.saldo_setelah),
      barang_id: String(ledger.barang_id),
      kode_perangkat: barang?.kode_perangkat || "-",
      nama_barang: barang?.nama_barang || "-",
      surat_jalan_id: suratJalan ? String(suratJalan.surat_jalan_id) : "-",
      nomor_surat_jalan: suratJalan?.nomor_surat_jalan || "-",
      tipe_surat_jalan: suratJalan?.tipe || "-",
      status_surat_jalan: suratJalan?.status || "-",
      project_nama: suratJalan?.project?.nama_project || "-",
      area: suratJalan?.project?.area || "-",
      gudang: suratJalan?.gudang_asal?.nama_gudang || suratJalan?.gudang_tujuan?.nama_gudang || "-",
      gudang_asal_id: suratJalan?.gudang_asal_id ? String(suratJalan.gudang_asal_id) : null,
      gudang_tujuan_id: suratJalan?.gudang_tujuan_id ? String(suratJalan.gudang_tujuan_id) : null,
      tiket_id: tiket ? String(tiket.tiket_id) : "-",
      kode_tiket: tiket?.kode_tiket || "-",
      is_kelebihan: item?.is_kelebihan || false,
      diproses_oleh: suratJalan?.creator?.nama || "-",
      diproses_oleh_role: suratJalan?.creator?.role || "-",
    };
  });

  return {
    data: rows,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

const getAuditLogs = async (filters = {}) => {
  const {
    search = "",
    actorId = "all",
    actorRole = "all",
    action = "all",
    entityType = "all",
    tiketId = "all",
    kodeTiket = "",
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = filters;

  const where = {};

  if (search.trim()) {
    where.OR = [
      { entity_type: { contains: search, mode: "insensitive" } },
      { actor: { nama: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (actorId !== "all") {
    where.actor_id = BigInt(actorId);
  }

  if (actorRole !== "all") {
    where.actor = { role: actorRole };
  }

  if (action !== "all") {
    where.aksi = action;
  }

  if (entityType !== "all") {
    where.entity_type = entityType;
  }

  if (kodeTiket.trim()) {
    const tiket = await prisma.tiket_material.findFirst({
      where: { kode_tiket: { contains: kodeTiket.trim(), mode: "insensitive" } },
      select: { tiket_id: true },
    });
    if (tiket) {
      where.AND = [
        { entity_type: "reconciliation" },
        { entity_id: BigInt(tiket.tiket_id) },
      ];
    } else {
      where.AND = [
        { entity_id: BigInt(-1) },
      ];
    }
  } else if (tiketId !== "all") {
    where.entity_id = BigInt(tiketId);
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(startDate);
    if (endDate) where.created_at.lte = new Date(endDate + "T23:59:59");
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.audit_log.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: "desc" },
      include: {
        actor: {
          select: {
            nama: true,
            email: true,
            role: true,
            personils: {
              select: {
                nama: true,
              },
            },
          },
        },
      },
    }),

    prisma.audit_log.count({ where }),
  ]);

  const rows = data.map((log) => ({
    audit_id: String(log.audit_id),
    created_at: log.created_at,
    aksi: log.aksi,
    entity_type: log.entity_type,
    entity_id: String(log.entity_id),
    actor_id: String(log.actor_id),
    actor_nama: log.actor?.personils?.[0]?.nama || log.actor?.nama || "-",
    actor_email: log.actor?.email || "-",
    actor_role: log.actor?.role || "-",
    data_sebelum: log.data_sebelum,
    data_sesudah: log.data_sesudah,
  }));

  return {
    data: rows,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

const getRackUtilization = async () => {
  const racks = await prisma.rak.findMany({
    include: {
      zona_gudang: {
        include: {
          gudang: {
            select: {
              nama_gudang: true,
              tipe: true,
            },
          },
        },
      },
      bins: {
        select: {
          bin_id: true,
          kode_bin: true,
          stoks: {
            select: {
              qty: true,
              barang: {
                select: {
                  nama_barang: true,
                  kode_perangkat: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return racks.map((rak) => {
    const totalBins = rak.bins?.length || 0;
    const occupiedBins = rak.bins?.filter((bin) => bin.stoks && bin.stoks.length > 0).length || 0;
    const totalQty = rak.bins?.reduce((sum, bin) => {
      return sum + bin.stoks?.reduce((s, stok) => s + Number(stok.qty || 0), 0) || 0;
    }, 0) || 0;

    return {
      rak_id: String(rak.rak_id),
      kode_rak: rak.kode_rak,
      zona_id: String(rak.zona_id),
      zona_nama: rak.zona_gudang?.nama_zona || "-",
      gudang_id: String(rak.zona_gudang?.gudang_id || ""),
      gudang_nama: rak.zona_gudang?.gudang?.nama_gudang || "-",
      gudang_tipe: rak.zona_gudang?.gudang?.tipe || "-",
      total_bins: totalBins,
      occupied_bins: occupiedBins,
      utilization_percent: totalBins > 0 ? Math.round((occupiedBins / totalBins) * 100) : 0,
      total_qty: totalQty,
    };
  });
};

const getHardwareReconciliation = async (filters = {}) => {
  const { projectId = "all", search = "" } = filters;

  const projects = await prisma.project.findMany({
    where: {
      status_aktif: true,
      ...(projectId !== "all" && { project_id: BigInt(projectId) }),
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

  const boqRecords = await prisma.boq.findMany({
    where: {
      status: { in: ["draft", "aktif"] },
      ...(projectId !== "all" && {
        tiket: { project_id: BigInt(projectId) },
      }),
    },
    include: {
      tiket: {
        select: {
          project_id: true,
        },
      },
      items: {
        select: {
          barang_id: true,
          qty_rencana: true,
          barang: {
            select: {
              nama_barang: true,
              kode_perangkat: true,
            },
          },
        },
      },
    },
  });

  const shipmentTotals = await prisma.surat_jalan.findMany({
    where: {
      status: "diterima_didistribusikan",
      ...(projectId !== "all" && { project_id: BigInt(projectId) }),
    },
    select: {
      tipe: true,
      project_id: true,
      items: {
        select: {
          qty: true,
          barang_id: true,
          is_kelebihan: true,
        },
      },
    },
  });

  const boqByProject = new Map();
  const additionalByProject = new Map();
  const hardwareOnSiteByProject = new Map();
  const usedByProject = new Map();

  for (const boq of boqRecords) {
    const projectIdNum = Number(boq.tiket?.project_id);
    if (!projectIdNum) continue;

    const currentBoq = boqByProject.get(projectIdNum) || 0;
    const itemQty = boq.items?.reduce((sum, item) => sum + Number(item.qty_rencana || 0), 0) || 0;
    boqByProject.set(projectIdNum, currentBoq + itemQty);
  }

  const additionalRecords = await prisma.surat_jalan_item.findMany({
    where: {
      is_kelebihan: true,
      surat_jalan: {
        status: "diterima_didistribusikan",
        ...(projectId !== "all" && { project_id: BigInt(projectId) }),
      },
    },
    select: {
      qty: true,
      surat_jalan: {
        select: {
          project_id: true,
        },
      },
    },
  });

  for (const item of additionalRecords) {
    const projectIdNum = Number(item.surat_jalan?.project_id);
    if (!projectIdNum) continue;
    additionalByProject.set(
      projectIdNum,
      (additionalByProject.get(projectIdNum) || 0) + Number(item.qty || 0)
    );
  }

  for (const shipment of shipmentTotals) {
    const projectIdNum = Number(shipment.project_id);
    if (!projectIdNum) continue;

    const totalQty = shipment.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

    if (shipment.tipe === "inbound") {
      hardwareOnSiteByProject.set(
        projectIdNum,
        (hardwareOnSiteByProject.get(projectIdNum) || 0) + totalQty
      );
    }

    if (shipment.tipe === "outbound") {
      usedByProject.set(
        projectIdNum,
        (usedByProject.get(projectIdNum) || 0) + totalQty
      );
    }
  }

  return projects.map((project) => {
    const projectIdNum = Number(project.project_id);
    const boq = Number(boqByProject.get(projectIdNum) || 0);
    const additional = Number(additionalByProject.get(projectIdNum) || 0);
    const hardwareOnSite = Number(hardwareOnSiteByProject.get(projectIdNum) || 0);
    const used = Number(usedByProject.get(projectIdNum) || 0);
    const remains = hardwareOnSite - (boq + additional);

    let status = "berjalan";
    if (remains < 0) {
      status = "perhatian";
    } else if (hardwareOnSite >= boq + additional && boq > 0) {
      status = "sesuai";
    }

    return {
      project_id: projectIdNum,
      project_nama: project.title || project.nama_project || "Project",
      cluster_id: project.cluster_id || "-",
      area: project.area || "-",
      boq,
      additional,
      hardware_on_site: hardwareOnSite,
      used,
      remains,
      status,
    };
  });
};

const getHardwareReconciliationPerTiket = async (filters = {}) => {
  const { projectId = "all", search = "", startDate, endDate, page = 1, limit = 50 } = filters;

  const tiketWhere = {};
  if (projectId !== "all") {
    tiketWhere.project_id = BigInt(projectId);
  }

  const tikets = await prisma.tiket_material.findMany({
    where: tiketWhere,
    include: {
      project: {
        select: {
          project_id: true,
          nama_project: true,
          area: true,
          cluster_id: true,
        },
      },
      boq: {
        where: { status: { in: ["draft", "aktif"] } },
        include: {
          items: {
            select: {
              qty_rencana: true,
            },
          },
        },
      },
    },
  });

  const shipmentWhere = {
    status: "diterima_didistribusikan",
  };
  if (projectId !== "all") {
    shipmentWhere.project_id = BigInt(projectId);
  }
  if (startDate || endDate) {
    shipmentWhere.tanggal = {};
    if (startDate) shipmentWhere.tanggal.gte = new Date(startDate);
    if (endDate) shipmentWhere.tanggal.lte = new Date(endDate + "T23:59:59");
  }

  const suratJalans = await prisma.surat_jalan.findMany({
    where: shipmentWhere,
    include: {
      items: {
        select: {
          qty: true,
          is_kelebihan: true,
        },
      },
    },
  });

  const inboundByProject = new Map();
  const outboundByProject = new Map();
  const additionalByProject = new Map();

  for (const sj of suratJalans) {
    const pid = Number(sj.project_id);
    if (!pid) continue;
    for (const item of sj.items) {
      const qty = Number(item.qty || 0);
      if (sj.tipe === "inbound") {
        if (item.is_kelebihan) {
          additionalByProject.set(pid, (additionalByProject.get(pid) || 0) + qty);
        } else {
          inboundByProject.set(pid, (inboundByProject.get(pid) || 0) + qty);
        }
      }
      if (sj.tipe === "outbound") {
        outboundByProject.set(pid, (outboundByProject.get(pid) || 0) + qty);
      }
    }
  }

  let rows = tikets.map((tiket) => {
    const projectIdNum = Number(tiket.project_id);
    const boqPlan = tiket.boq?.items?.reduce((sum, item) => sum + Number(item.qty_rencana || 0), 0) || 0;
    const additional = Number(additionalByProject.get(projectIdNum) || 0);
    const mos = tiket.mos ? Number(tiket.mos) : Number(inboundByProject.get(projectIdNum) || 0);
    const used = tiket.used ? Number(tiket.used) : Number(outboundByProject.get(projectIdNum) || 0);
    const remains = mos - (boqPlan + additional);

    let status = "berjalan";
    if (remains < 0) {
      status = "perhatian";
    } else if (mos >= boqPlan + additional && boqPlan > 0) {
      status = "sesuai";
    }

    return {
      tiket_id: String(tiket.tiket_id),
      kode_tiket: tiket.kode_tiket,
      project_id: projectIdNum,
      project_nama: tiket.project?.nama_project || "-",
      cluster_id: tiket.project?.cluster_id || "-",
      area: tiket.project?.area || "-",
      boq_plan: boqPlan,
      additional,
      mos,
      used,
      remains,
      status,
    };
  });

  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter((row) =>
      [row.kode_tiket, row.project_nama, row.cluster_id, row.area]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  const total = rows.length;
  const skip = (Number(page) - 1) * Number(limit);
  const paginatedRows = rows.slice(skip, skip + Number(limit));

  return {
    data: paginatedRows,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

const getHardwareReconciliationDetailed = async (filters = {}) => {
  const { projectId = "all", search = "" } = filters;

  const whereBoq = {
    status: { in: ["draft", "aktif"] },
  };

  if (projectId !== "all") {
    whereBoq.tiket = { project_id: BigInt(projectId) };
  }

  const boqItems = await prisma.boq_item.findMany({
    where: whereBoq,
    include: {
      boq: {
        include: {
          tiket: {
            select: {
              project_id: true,
              nama_project: true,
              area: true,
              cluster_id: true,
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
    },
  });

  const shipmentItems = await prisma.surat_jalan_item.findMany({
    where: {
      surat_jalan: {
        status: "diterima_didistribusikan",
        ...(projectId !== "all" && { project_id: BigInt(projectId) }),
      },
    },
    include: {
      surat_jalan: {
        select: {
          tipe: true,
          project_id: true,
        },
      },
    },
  });

  const inboundByBarang = new Map();
  const outboundByBarang = new Map();
  const additionalByBarang = new Map();

  for (const item of shipmentItems) {
    const barangId = String(item.barang_id);
    const qty = Number(item.qty || 0);
    const projectIdNum = Number(item.surat_jalan?.project_id);

    if (item.surat_jalan?.tipe === "inbound") {
      if (item.is_kelebihan) {
        additionalByBarang.set(
          `${projectIdNum}-${barangId}`,
          (additionalByBarang.get(`${projectIdNum}-${barangId}`) || 0) + qty
        );
      } else {
        inboundByBarang.set(
          `${projectIdNum}-${barangId}`,
          (inboundByBarang.get(`${projectIdNum}-${barangId}`) || 0) + qty
        );
      }
    }

    if (item.surat_jalan?.tipe === "outbound") {
      outboundByBarang.set(
        `${projectIdNum}-${barangId}`,
        (outboundByBarang.get(`${projectIdNum}-${barangId}`) || 0) + qty
      );
    }
  }

  const rows = boqItems.map((item) => {
    const project = item.boq?.tiket;
    const projectIdNum = Number(project?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;

    const boq = Number(item.qty_rencana || 0);
    const additional = Number(additionalByBarang.get(key) || 0);
    const hardwareOnSite = Number(inboundByBarang.get(key) || 0);
    const used = Number(outboundByBarang.get(key) || 0);
    const remains = hardwareOnSite - (boq + additional);

    let status = "berjalan";
    if (remains < 0) {
      status = "perhatian";
    } else if (hardwareOnSite >= boq + additional && boq > 0) {
      status = "sesuai";
    }

    return {
      project_id: projectIdNum,
      project_nama: project?.nama_project || "-",
      cluster_id: project?.cluster_id || "-",
      area: project?.area || "-",
      barang_id: barangId,
      kode_perangkat: item.barang?.kode_perangkat || "-",
      nama_barang: item.barang?.nama_barang || "-",
      boq,
      additional,
      hardware_on_site: hardwareOnSite,
      used,
      remains,
      status,
    };
  });

  let filtered = rows;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = rows.filter((row) =>
      [
        row.project_nama,
        row.area,
        row.cluster_id,
        row.kode_perangkat,
        row.nama_barang,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  return { data: filtered };
};

const getZoneUtilizationHistory = async (filters = {}) => {
  const {
    gudangId = "all",
    zonaId = "all",
    status = "all",
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = filters;

  const where = {};

  if (gudangId !== "all") {
    where.zona = { gudang_id: BigInt(gudangId) };
  }

  if (zonaId !== "all") {
    where.zona_id = BigInt(zonaId);
  }

  if (status !== "all") {
    where.status = status;
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(startDate);
    if (endDate) where.created_at.lte = new Date(endDate + "T23:59:59");
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.zona_utilisasi_log.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: "desc" },
      include: {
        zona: {
          include: {
            gudang: {
              select: {
                nama_gudang: true,
                tipe: true,
              },
            },
          },
        },
        diperbarui_user: {
          select: {
            nama: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.zona_utilisasi_log.count({ where }),
  ]);

  const rows = data.map((log) => ({
    log_id: String(log.log_id),
    created_at: log.created_at,
    zona_id: String(log.zona_id),
    zona_kode: log.zona?.kode_zona || "-",
    zona_nama: log.zona?.nama_zona || "-",
    gudang_id: log.zona?.gudang_id ? String(log.zona.gudang_id) : "-",
    gudang_nama: log.zona?.gudang?.nama_gudang || "-",
    gudang_tipe: log.zona?.gudang?.tipe || "-",
    status: log.status,
    diperbarui_oleh: String(log.diperbarui_oleh),
    diperbarui_nama: log.diperbarui_user?.nama || "-",
    diperbarui_email: log.diperbarui_user?.email || "-",
    diperbarui_role: log.diperbarui_user?.role || "-",
    catatan: log.catatan || "-",
  }));

  return {
    data: rows,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

const getZoneUtilization = async (filters = {}) => {
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
          nama_gudang: true,
          tipe: true,
        },
      },
    },
    orderBy: [
      { gudang_id: "asc" },
      { kode_zona: "asc" },
    ],
  });

  return zonas.map((zona) => ({
    zona_id: String(zona.zona_id),
    zona_kode: zona.kode_zona,
    zona_nama: zona.nama_zona || zona.kode_zona,
    gudang_id: String(zona.gudang_id),
    gudang_nama: zona.gudang?.nama_gudang || "-",
    gudang_tipe: zona.gudang?.tipe || "-",
    status_kecukupan: zona.status_kecukupan || "CUKUP",
    utilisasi_persen: zona.utilisasi_persen ?? null,
  }));
};

const backfillReconciliation = async () => {
  const tikets = await prisma.tiket_material.findMany({
    include: {
      project: true,
      boq: {
        include: {
          items: {
            select: {
              qty_rencana: true,
            },
          },
        },
      },
    },
  });

  const allSuratJalans = await prisma.surat_jalan.findMany({
    where: { status: "diterima_didistribusikan" },
    include: {
      items: {
        select: {
          qty: true,
          is_kelebihan: true,
        },
      },
    },
  });

  const inboundByProject = new Map();
  const outboundByProject = new Map();
  const additionalByProject = new Map();

  for (const sj of allSuratJalans) {
    const pid = Number(sj.project_id);
    if (!pid) continue;
    for (const item of sj.items) {
      const qty = Number(item.qty || 0);
      if (sj.tipe === "inbound") {
        if (item.is_kelebihan) {
          additionalByProject.set(pid, (additionalByProject.get(pid) || 0) + qty);
        } else {
          inboundByProject.set(pid, (inboundByProject.get(pid) || 0) + qty);
        }
      }
      if (sj.tipe === "outbound") {
        outboundByProject.set(pid, (outboundByProject.get(pid) || 0) + qty);
      }
    }
  }

  for (const tiket of tikets) {
    const pid = Number(tiket.project_id);
    const mos = Number(inboundByProject.get(pid) || 0);
    const used = Number(outboundByProject.get(pid) || 0);

    await prisma.tiket_material.update({
      where: { tiket_id: tiket.tiket_id },
      data: { mos, used },
    });
  }

  return { updated: tikets.length };
};

module.exports = {
  getStockHistory,
  getAuditLogs,
  getRackUtilization,
  getHardwareReconciliation,
  getHardwareReconciliationPerTiket,
  getHardwareReconciliationDetailed,
  getZoneUtilizationHistory,
  getZoneUtilization,
  backfillReconciliation,
};
