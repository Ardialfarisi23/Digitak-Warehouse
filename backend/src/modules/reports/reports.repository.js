const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");
const reconciliationService = require("../reconciliation/reconciliation.service");
const returnRepository = require("../return/return.repository");
const { getApprovedReturnsAfterSnapshot, getLatestPhysicalSnapshot } = returnRepository;

const AUDIT_AKSI_VALUES = [
  "create",
  "update",
  "delete",
  "approve",
  "receive_inbound",
  "approve_inbound",
  "approve_outbound",
  "confirm_distributed",
  "reject_inbound",
  "reject_outbound",
  "putaway",
  "retrieve",
  "create_inbound",
  "create_outbound",
];

const enrichAuditEntityNames = async (logs) => {
  if (!Array.isArray(logs) || logs.length === 0) {
    return logs.map((log) => ({ ...log, entity_name: null, entity_refs_resolved: {} }));
  }

  const groupedEntity = new Map();
  const refGroups = {
    tiket_id: new Set(),
    surat_jalan_id: new Set(),
    gudang_asal_id: new Set(),
    gudang_tujuan_id: new Set(),
    project_id: new Set(),
    boq_id: new Set(),
    zona_id: new Set(),
    barang_id: new Set(),
    surat_jalan_item_id: new Set(),
  };

  for (const log of logs) {
    const type = log.entity_type;
    if (!groupedEntity.has(type)) {
      groupedEntity.set(type, new Set());
    }
    groupedEntity.get(type).add(Number(log.entity_id));

    for (const payload of [log.data_sebelum, log.data_sesudah]) {
      if (!payload || typeof payload !== "object") continue;
      for (const key of Object.keys(payload)) {
        if (key in refGroups) {
          const value = Number(payload[key]);
          if (Number.isFinite(value) && value > 0) {
            refGroups[key].add(value);
          }
        }
      }
    }
  }

  const nameMap = new Map();
  const refMaps = {
    tiket_id: new Map(),
    surat_jalan_id: new Map(),
    gudang_asal_id: new Map(),
    gudang_tujuan_id: new Map(),
    project_id: new Map(),
    boq_id: new Map(),
    zona_id: new Map(),
    barang_id: new Map(),
    surat_jalan_item_id: new Map(),
  };

  for (const [entityType, idSet] of groupedEntity) {
    const ids = Array.from(idSet).filter((id) => Number.isFinite(id) && id > 0);
    if (!ids.length) continue;

    switch (entityType) {
      case "boq": {
        const rows = await prisma.boq.findMany({
          where: { boq_id: { in: ids } },
          select: { boq_id: true, boq_number: true },
        });
        for (const row of rows) {
          nameMap.set(`boq:${row.boq_id}`, row.boq_number);
        }
        break;
      }
      case "surat_jalan": {
        const rows = await prisma.surat_jalan.findMany({
          where: { surat_jalan_id: { in: ids } },
          select: { surat_jalan_id: true, nomor_surat_jalan: true },
        });
        for (const row of rows) {
          nameMap.set(`surat_jalan:${row.surat_jalan_id}`, row.nomor_surat_jalan);
        }
        break;
      }
      case "project": {
        const rows = await prisma.project.findMany({
          where: { project_id: { in: ids } },
          select: { project_id: true, nama_project: true },
        });
        for (const row of rows) {
          nameMap.set(`project:${row.project_id}`, row.nama_project);
        }
        break;
      }
      case "titik_lapangan": {
        const rows = await prisma.titik_lapangan.findMany({
          where: { titik_lapangan_id: { in: ids } },
          select: { titik_lapangan_id: true, nama_lokasi: true },
        });
        for (const row of rows) {
          nameMap.set(`titik_lapangan:${row.titik_lapangan_id}`, row.nama_lokasi);
        }
        break;
      }
      case "user_account": {
        const rows = await prisma.user_account.findMany({
          where: { user_id: { in: ids } },
          select: { user_id: true, nama: true },
        });
        for (const row of rows) {
          nameMap.set(`user_account:${row.user_id}`, row.nama);
        }
        break;
      }
      case "reconciliation": {
        // Tidak ada tabel reconciliation tersendiri; entity_id di sini
        // adalah tiket_id yang merujuk ke tiket_material. Dikecualikan
        // sesuai permintaan investigasi.
        break;
      }
      default:
        break;
    }
  }

  if (refGroups.tiket_id.size) {
    const ids = Array.from(refGroups.tiket_id);
    const rows = await prisma.tiket_material.findMany({
      where: { tiket_id: { in: ids } },
      select: { tiket_id: true, kode_tiket: true },
    });
    for (const row of rows) {
      refMaps.tiket_id.set(Number(row.tiket_id), row.kode_tiket);
    }
  }

  if (refGroups.surat_jalan_id.size) {
    const ids = Array.from(refGroups.surat_jalan_id);
    const rows = await prisma.surat_jalan.findMany({
      where: { surat_jalan_id: { in: ids } },
      select: { surat_jalan_id: true, nomor_surat_jalan: true },
    });
    for (const row of rows) {
      refMaps.surat_jalan_id.set(Number(row.surat_jalan_id), row.nomor_surat_jalan);
    }
  }

  if (refGroups.gudang_asal_id.size) {
    const ids = Array.from(refGroups.gudang_asal_id);
    const rows = await prisma.gudang.findMany({
      where: { gudang_id: { in: ids } },
      select: { gudang_id: true, nama_gudang: true },
    });
    for (const row of rows) {
      refMaps.gudang_asal_id.set(Number(row.gudang_id), row.nama_gudang);
    }
  }

  if (refGroups.gudang_tujuan_id.size) {
    const ids = Array.from(refGroups.gudang_tujuan_id);
    const rows = await prisma.gudang.findMany({
      where: { gudang_id: { in: ids } },
      select: { gudang_id: true, nama_gudang: true },
    });
    for (const row of rows) {
      refMaps.gudang_tujuan_id.set(Number(row.gudang_id), row.nama_gudang);
    }
  }

  if (refGroups.project_id.size) {
    const ids = Array.from(refGroups.project_id);
    const rows = await prisma.project.findMany({
      where: { project_id: { in: ids } },
      select: { project_id: true, nama_project: true },
    });
    for (const row of rows) {
      refMaps.project_id.set(Number(row.project_id), row.nama_project);
    }
  }

  if (refGroups.boq_id.size) {
    const ids = Array.from(refGroups.boq_id);
    const rows = await prisma.boq.findMany({
      where: { boq_id: { in: ids } },
      select: { boq_id: true, boq_number: true },
    });
    for (const row of rows) {
      refMaps.boq_id.set(Number(row.boq_id), row.boq_number);
    }
  }

  if (refGroups.zona_id.size) {
    const ids = Array.from(refGroups.zona_id);
    const rows = await prisma.zona_gudang.findMany({
      where: { zona_id: { in: ids } },
      select: { zona_id: true, nama_zona: true, kode_zona: true },
    });
    for (const row of rows) {
      refMaps.zona_id.set(Number(row.zona_id), row.nama_zona || row.kode_zona || `Zona ${row.zona_id}`);
    }
  }

  if (refGroups.barang_id.size) {
    const ids = Array.from(refGroups.barang_id);
    const rows = await prisma.barang.findMany({
      where: { barang_id: { in: ids } },
      select: { barang_id: true, nama_barang: true, kode_perangkat: true },
    });
    for (const row of rows) {
      refMaps.barang_id.set(Number(row.barang_id), row.nama_barang || row.kode_perangkat || `Barang ${row.barang_id}`);
    }
  }

  if (refGroups.surat_jalan_item_id.size) {
    const ids = Array.from(refGroups.surat_jalan_item_id);
    const rows = await prisma.surat_jalan_item.findMany({
      where: { item_id: { in: ids } },
      select: { item_id: true, barang_id: true, qty: true },
    });
    for (const row of rows) {
      refMaps.surat_jalan_item_id.set(Number(row.item_id), `Item #${row.item_id} (barang ${row.barang_id}, qty ${row.qty})`);
    }
  }

  return logs.map((log) => {
    const entity_refs_resolved = {};
    for (const key of Object.keys(refGroups)) {
      const value = log.data_sebelum?.[key] ?? log.data_sesudah?.[key];
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0 && refMaps[key].has(numeric)) {
        entity_refs_resolved[key] = refMaps[key].get(numeric);
      } else {
        entity_refs_resolved[key] = null;
      }
    }

    return {
      ...log,
      entity_name: nameMap.get(`${log.entity_type}:${String(log.entity_id)}`) ?? null,
      entity_refs_resolved,
    };
  });
};

/**
 * Mengubah filter ID dari query string menjadi BigInt secara aman.
 * Mengembalikan null bila filter tidak dipakai ("all"/kosong/undefined),
 * dan melempar AppError 400 (bukan 500) bila nilainya bukan ID numerik.
 */
const parseIdFilter = (value, fieldName) => {
  if (value === undefined || value === null) return null;

  const raw = String(value).trim();
  if (!raw || raw === "all") return null;

  if (!/^\d+$/.test(raw)) {
    throw new AppError(
      `Parameter "${fieldName}" harus berupa ID numerik, diterima: "${raw}".`,
      400
    );
  }

  return BigInt(raw);
};

const getStockHistory = async (filters = {}) => {
  const {
    search = "",
    projectId = "all",
    warehouseId = "all",
    zonaId = "all",
    kategoriId = "all",
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

  // --- Filter di level surat_jalan (project / tipe / status / gudang) ---
  const suratJalanWhere = {};

  const projectIdFilter = parseIdFilter(projectId, "projectId");
  if (projectIdFilter !== null) {
    suratJalanWhere.project_id = projectIdFilter;
  }
  if (type && type !== "all") {
    suratJalanWhere.tipe = type;
  }
  if (status && status !== "all") {
    suratJalanWhere.status = status;
  }

  const warehouseIdFilter = parseIdFilter(warehouseId, "warehouseId");
  if (warehouseIdFilter !== null) {
    suratJalanWhere.OR = [
      { gudang_asal_id: warehouseIdFilter },
      { gudang_tujuan_id: warehouseIdFilter },
    ];
  }

  // --- Filter di level surat_jalan_item (zona) ---
  // Sengaja memfilter memakai zona_id (PK, unik global), BUKAN kode_zona.
  // zona_gudang hanya punya @@unique([gudang_id, kode_zona]), jadi "Zona A"
  // ada di beberapa gudang; memfilter by kode_zona akan mencampur gudang.
  const suratJalanItemWhere = {};

  const zonaIdFilter = parseIdFilter(zonaId, "zonaId");
  if (zonaIdFilter !== null) {
    suratJalanItemWhere.zona_id = zonaIdFilter;
  }

  if (Object.keys(suratJalanWhere).length > 0) {
    suratJalanItemWhere.surat_jalan = suratJalanWhere;
  }

  if (Object.keys(suratJalanItemWhere).length > 0) {
    where.surat_jalan_item = suratJalanItemWhere;
  }

  // --- Filter di level barang (kategori perangkat) ---
  // stok_ledger punya FK barang_id sendiri, jadi cukup 1 hop tanpa lewat
  // surat_jalan_item.
  const kategoriIdFilter = parseIdFilter(kategoriId, "kategoriId");
  if (kategoriIdFilter !== null) {
    where.barang = { kategori_id: kategoriIdFilter };
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
        barang: {
          select: {
            kode_perangkat: true,
            nama_barang: true,
            kategori: {
              select: {
                kategori_id: true,
                nama_kategori: true,
              },
            },
          },
        },
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
                kategori: {
                  select: {
                    kategori_id: true,
                    nama_kategori: true,
                  },
                },
              },
            },
            satuan: {
              select: {
                kode_satuan: true,
              },
            },
            // Zona penempatan item. Hanya terisi untuk item yang sudah melewati
            // alur putaway (surat_jalan_item.zona_id nullable), jadi bisa null.
            // kode_zona cuma unik per gudang -> nama gudang ikut diambil supaya
            // "Zona A" tidak ambigu antar gudang.
            zona: {
              select: {
                zona_id: true,
                kode_zona: true,
                nama_zona: true,
                tipe_zona: true,
                gudang: {
                  select: {
                    nama_gudang: true,
                  },
                },
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
    const barang = item?.barang ?? ledger.barang;
    const tiket = suratJalan?.boq?.tiket;
    const zona = item?.zona;

    const gudangAsal = suratJalan?.gudang_asal?.nama_gudang || null;
    const gudangTujuan = suratJalan?.gudang_tujuan?.nama_gudang || null;

    return {
      ledger_id: String(ledger.ledger_id),
      waktu_mutasi: ledger.waktu_mutasi,
      jenis_mutasi: ledger.jenis_mutasi,
      qty: Number(ledger.qty),
      satuan: item?.satuan?.kode_satuan || "-",
      saldo_setelah: Number(ledger.saldo_setelah),
      barang_id: String(ledger.barang_id),
      kode_perangkat: barang?.kode_perangkat || "-",
      nama_barang: barang?.nama_barang || "-",
      kategori_id: barang?.kategori?.kategori_id ? String(barang.kategori.kategori_id) : null,
      kategori_nama: barang?.kategori?.nama_kategori || "-",
      kondisi: item?.kondisi || "-",
      surat_jalan_id: suratJalan ? String(suratJalan.surat_jalan_id) : "-",
      nomor_surat_jalan: suratJalan?.nomor_surat_jalan || "-",
      tipe_surat_jalan: suratJalan?.tipe || "-",
      status_surat_jalan: suratJalan?.status || "-",
      project_nama: suratJalan?.project?.nama_project || "-",
      area: suratJalan?.project?.area || "-",
      // `gudang` dipertahankan untuk kompatibilitas konsumen lama.
      gudang: gudangAsal || gudangTujuan || "-",
      // Asal & tujuan dipisah: level GUDANG (antar/keluar-masuk gudang).
      gudang_asal: gudangAsal || "-",
      gudang_tujuan: gudangTujuan || "-",
      gudang_asal_id: suratJalan?.gudang_asal_id ? String(suratJalan.gudang_asal_id) : null,
      gudang_tujuan_id: suratJalan?.gudang_tujuan_id ? String(suratJalan.gudang_tujuan_id) : null,
      // Zona: sub-lokasi DI DALAM satu gudang (granularitas lebih kecil dari
      // gudang_asal/gudang_tujuan, bukan duplikatnya).
      zona_id: zona?.zona_id ? String(zona.zona_id) : null,
      zona_kode: zona?.kode_zona || "-",
      zona_nama: zona?.nama_zona || "-",
      zona_tipe: zona?.tipe_zona || "-",
      zona_gudang: zona?.gudang?.nama_gudang || "-",
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

const getStockHistoryForExport = async (filters = {}) => {
  const {
    search = "",
    projectId = "all",
    warehouseId = "all",
    zonaId = "all",
    kategoriId = "all",
    type = "all",
    status = "all",
    startDate,
    endDate,
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
                    kode_tiket: { contains: s, mode: "insensitive" } },
                },
              },
            ],
          },
        },
      },
    ];
  }

  const suratJalanWhere = {};

  const projectIdFilter = parseIdFilter(projectId, "projectId");
  if (projectIdFilter !== null) {
    suratJalanWhere.project_id = projectIdFilter;
  }
  if (type && type !== "all") {
    suratJalanWhere.tipe = type;
  }
  if (status && status !== "all") {
    suratJalanWhere.status = status;
  }

  const warehouseIdFilter = parseIdFilter(warehouseId, "warehouseId");
  if (warehouseIdFilter !== null) {
    suratJalanWhere.OR = [
      { gudang_asal_id: warehouseIdFilter },
      { gudang_tujuan_id: warehouseIdFilter },
    ];
  }

  const suratJalanItemWhere = {};

  const zonaIdFilter = parseIdFilter(zonaId, "zonaId");
  if (zonaIdFilter !== null) {
    suratJalanItemWhere.zona_id = zonaIdFilter;
  }

  if (Object.keys(suratJalanWhere).length > 0) {
    suratJalanItemWhere.surat_jalan = suratJalanWhere;
  }

  if (Object.keys(suratJalanItemWhere).length > 0) {
    where.surat_jalan_item = suratJalanItemWhere;
  }

  const kategoriIdFilter = parseIdFilter(kategoriId, "kategoriId");
  if (kategoriIdFilter !== null) {
    where.barang = { kategori_id: kategoriIdFilter };
  }

  if (startDate || endDate) {
    where.waktu_mutasi = {};
    if (startDate) where.waktu_mutasi.gte = new Date(startDate);
    if (endDate) where.waktu_mutasi.lte = new Date(endDate + "T23:59:59");
  }

  const EXPORT_LIMIT = 10000;

  const [data, total] = await Promise.all([
    prisma.stok_ledger.findMany({
      where,
      skip: 0,
      take: EXPORT_LIMIT,
      orderBy: { waktu_mutasi: "desc" },
      include: {
        barang: {
          select: {
            kode_perangkat: true,
            nama_barang: true,
            kategori: {
              select: {
                kategori_id: true,
                nama_kategori: true,
              },
            },
          },
        },
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
                kategori: {
                  select: {
                    kategori_id: true,
                    nama_kategori: true,
                  },
                },
              },
            },
            satuan: {
              select: {
                kode_satuan: true,
              },
            },
            zona: {
              select: {
                zona_id: true,
                kode_zona: true,
                nama_zona: true,
                tipe_zona: true,
                gudang: {
                  select: {
                    nama_gudang: true,
                  },
                },
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
    const barang = item?.barang ?? ledger.barang;
    const tiket = suratJalan?.boq?.tiket;
    const zona = item?.zona;

    const gudangAsal = suratJalan?.gudang_asal?.nama_gudang || null;
    const gudangTujuan = suratJalan?.gudang_tujuan?.nama_gudang || null;

    return {
      ledger_id: String(ledger.ledger_id),
      waktu_mutasi: ledger.waktu_mutasi,
      jenis_mutasi: ledger.jenis_mutasi,
      qty: Number(ledger.qty),
      satuan: item?.satuan?.kode_satuan || "-",
      saldo_setelah: Number(ledger.saldo_setelah),
      barang_id: String(ledger.barang_id),
      kode_perangkat: barang?.kode_perangkat || "-",
      nama_barang: barang?.nama_barang || "-",
      kategori_id: barang?.kategori?.kategori_id ? String(barang.kategori.kategori_id) : null,
      kategori_nama: barang?.kategori?.nama_kategori || "-",
      kondisi: item?.kondisi || "-",
      surat_jalan_id: suratJalan ? String(suratJalan.surat_jalan_id) : "-",
      nomor_surat_jalan: suratJalan?.nomor_surat_jalan || "-",
      tipe_surat_jalan: suratJalan?.tipe || "-",
      status_surat_jalan: suratJalan?.status || "-",
      project_nama: suratJalan?.project?.nama_project || "-",
      area: suratJalan?.project?.area || "-",
      gudang: gudangAsal || gudangTujuan || "-",
      gudang_asal: gudangAsal || "-",
      gudang_tujuan: gudangTujuan || "-",
      gudang_asal_id: suratJalan?.gudang_asal_id ? String(suratJalan.gudang_asal_id) : null,
      gudang_tujuan_id: suratJalan?.gudang_tujuan_id ? String(suratJalan.gudang_tujuan_id) : null,
      zona_id: zona?.zona_id ? String(zona.zona_id) : null,
      zona_kode: zona?.kode_zona || "-",
      zona_nama: zona?.nama_zona || "-",
      zona_tipe: zona?.tipe_zona || "-",
      zona_gudang: zona?.gudang?.nama_gudang || "-",
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
      limit: EXPORT_LIMIT,
      truncated: total > EXPORT_LIMIT,
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
    const s = search.trim();
    const matchedAksi = AUDIT_AKSI_VALUES.filter((aksi) =>
      aksi.toLowerCase().includes(s.toLowerCase())
    );
    where.OR = [
      { entity_type: { contains: s, mode: "insensitive" } },
      { actor: { nama: { contains: s, mode: "insensitive" } } },
      ...(matchedAksi.length > 0 ? [{ aksi: { in: matchedAksi } }] : []),
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

  const enrichedData = await enrichAuditEntityNames(data);

  const rows = enrichedData.map((log) => ({
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
    entity_name: log.entity_name ?? null,
    entity_refs_resolved: log.entity_refs_resolved ?? {},
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

const getAuditLogForExport = async (filters = {}) => {
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
  } = filters;

  const where = {};

  if (search.trim()) {
    const s = search.trim();
    const matchedAksi = AUDIT_AKSI_VALUES.filter((aksi) =>
      aksi.toLowerCase().includes(s.toLowerCase())
    );
    where.OR = [
      { entity_type: { contains: s, mode: "insensitive" } },
      { actor: { nama: { contains: s, mode: "insensitive" } } },
      ...(matchedAksi.length > 0 ? [{ aksi: { in: matchedAksi } }] : []),
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

  const EXPORT_LIMIT = 10000;

  const [data, total] = await Promise.all([
    prisma.audit_log.findMany({
      where,
      skip: 0,
      take: EXPORT_LIMIT,
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

  const enrichedData = await enrichAuditEntityNames(data);

  const rows = enrichedData.map((log) => ({
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
    entity_name: log.entity_name ?? null,
    entity_refs_resolved: log.entity_refs_resolved ?? {},
  }));

  return {
    data: rows,
    meta: {
      total,
      limit: EXPORT_LIMIT,
      truncated: total > EXPORT_LIMIT,
    },
  };
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
      status: { in: ["draft", "aktif", "selesai"] },
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
      status: { in: ["disetujui", "diterima_didistribusikan"] },
      ...(projectId !== "all" && { project_id: BigInt(projectId) }),
    },
    select: {
      tipe: true,
      project_id: true,
      tujuan_tipe: true,
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

    if (shipment.tipe === "outbound" && shipment.tujuan_tipe !== "gudang") {
      hardwareOnSiteByProject.set(
        projectIdNum,
        (hardwareOnSiteByProject.get(projectIdNum) || 0) + totalQty
      );
    }

    if (shipment.tipe === "outbound" && shipment.tujuan_tipe !== "gudang") {
      usedByProject.set(
        projectIdNum,
        (usedByProject.get(projectIdNum) || 0) + totalQty
      );
    }
  }

  // Compute approved returns per project from the Return module.
  const approvedReturnByProject = new Map();

  for (const project of projects) {
    const projectIdNum = Number(project.project_id);
    const projectBoqRecords = boqRecords.filter(
      (b) => Number(b.tiket?.project_id || 0) === projectIdNum
    );

    const projectTickets = new Set();
    for (const boq of projectBoqRecords) {
      if (boq.tiket?.tiket_id) {
        projectTickets.add(boq.tiket.tiket_id);
      }
    }

    let totalApprovedQty = 0;
    for (const tiketId of projectTickets) {
      const barangIds = new Set();
      for (const boq of projectBoqRecords) {
        for (const item of boq.items || []) {
          if (item.barang_id) {
            barangIds.add(item.barang_id);
          }
        }
      }

      for (const barangId of barangIds) {
        const { snapshot } = await getLatestPhysicalSnapshot(tiketId, barangId);
        if (!snapshot) continue;

        const qty = await getApprovedReturnsAfterSnapshot(tiketId, barangId, snapshot.tanggal_laporan);
        totalApprovedQty += Number(qty);
      }
    }

    approvedReturnByProject.set(projectIdNum, totalApprovedQty);
  }

  return projects.map((project) => {
    const projectIdNum = Number(project.project_id);
    const boq = Number(boqByProject.get(projectIdNum) || 0);
    const additional = Number(additionalByProject.get(projectIdNum) || 0);
    const hardwareOnSite = Number(hardwareOnSiteByProject.get(projectIdNum) || 0);
    const used = Number(usedByProject.get(projectIdNum) || 0);
    const approvedReturnQty = Number(approvedReturnByProject.get(projectIdNum) || 0);
    const remains = hardwareOnSite - (boq + additional) - used - approvedReturnQty;

    let status = "berjalan";
    if (remains < 0) {
      status = "perhatian";
    } else if (remains >= 0 && boq > 0) {
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
      approved_return_qty: approvedReturnQty,
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
        where: { status: { in: ["draft", "aktif", "selesai"] } },
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
    status: { in: ["disetujui", "diterima_didistribusikan"] },
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
      if (sj.tipe === "outbound" && sj.tujuan_tipe !== "gudang") {
        outboundByProject.set(pid, (outboundByProject.get(pid) || 0) + qty);
      }
    }
  }

  // Compute approved returns per tiket from the Return module.
  const approvedReturnByTiket = new Map();

  for (const tiket of tikets) {
    const tiketId = tiket.tiket_id;
    const barangIds = new Set();
    for (const item of tiket.boq?.items || []) {
      if (item.barang_id) {
        barangIds.add(item.barang_id);
      }
    }

    let totalApprovedQty = 0;
    for (const barangId of barangIds) {
      const { snapshot } = await getLatestPhysicalSnapshot(tiketId, barangId);
      if (!snapshot) continue;

      const qty = await getApprovedReturnsAfterSnapshot(tiketId, barangId, snapshot.tanggal_laporan);
      totalApprovedQty += Number(qty);
    }

    approvedReturnByTiket.set(tiketId, totalApprovedQty);
  }

  let rows = tikets.map((tiket) => {
    const projectIdNum = Number(tiket.project_id);
    const boqPlan = tiket.boq?.items?.reduce((sum, item) => sum + Number(item.qty_rencana || 0), 0) || 0;
    const additional = Number(additionalByProject.get(projectIdNum) || 0);
    const mos = Number(outboundByProject.get(projectIdNum) || 0);
    const used = tiket.used ? Number(tiket.used) : Number(outboundByProject.get(projectIdNum) || 0);
    const approvedReturnQty = Number(approvedReturnByTiket.get(tiket.tiket_id) || 0);
    const remains = mos - (boqPlan + additional) - used - approvedReturnQty;

    let status = "berjalan";
    if (remains < 0) {
      status = "perhatian";
    } else if (remains >= 0 && boqPlan > 0) {
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
      approved_return_qty: approvedReturnQty,
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
    status: { in: ["draft", "aktif", "selesai"] },
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
        status: { in: ["disetujui", "diterima_didistribusikan"] },
        ...(projectId !== "all" && { project_id: BigInt(projectId) }),
      },
    },
    include: {
      surat_jalan: {
        select: {
          tipe: true,
          project_id: true,
          tujuan_tipe: true,
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

    if (item.surat_jalan?.tipe === "outbound" && item.surat_jalan?.tujuan_tipe !== "gudang") {
      outboundByBarang.set(
        `${projectIdNum}-${barangId}`,
        (outboundByBarang.get(`${projectIdNum}-${barangId}`) || 0) + qty
      );
    }
  }

  // Compute approved returns per project+barang from the Return module.
  const approvedReturnByProjectBarang = new Map();
  const projectBarangKeys = new Set();

  for (const item of boqItems) {
    const project = item.boq?.tiket;
    const projectIdNum = Number(project?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;
    projectBarangKeys.add(key);
  }

  for (const key of projectBarangKeys) {
    const [projectIdNum, barangId] = key.split("-").map(Number);
    if (!projectIdNum || !barangId) continue;

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

  const rows = boqItems.map((item) => {
    const project = item.boq?.tiket;
    const projectIdNum = Number(project?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;

    const boq = Number(item.qty_rencana || 0);
    const additional = Number(additionalByBarang.get(key) || 0);
    const hardwareOnSite = Number(outboundByBarang.get(key) || 0);
    const used = Number(outboundByBarang.get(key) || 0);
    const approvedReturnQty = Number(approvedReturnByProjectBarang.get(key) || 0);
    const remains = hardwareOnSite - (boq + additional) - used - approvedReturnQty;

    let status = "berjalan";
    if (remains < 0) {
      status = "perhatian";
    } else if (remains >= 0 && boq > 0) {
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
      approved_return_qty: approvedReturnQty,
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

const backfillReconciliation = async (actorId) => {
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
      if (sj.tipe === "outbound" && sj.tujuan_tipe !== "gudang") {
        outboundByProject.set(pid, (outboundByProject.get(pid) || 0) + qty);
      }
    }
  }

  const affectedTiketIds = [];

  for (const tiket of tikets) {
    const existingLaporan = await prisma.laporan_mitra.findFirst({
      where: {
        tiket_id: tiket.tiket_id,
        is_aktif: true,
      },
    });

    if (existingLaporan) {
      continue;
    }

    const pid = Number(tiket.project_id);
    const mos = Number(inboundByProject.get(pid) || 0);
    const used = Number(outboundByProject.get(pid) || 0);

    await prisma.laporan_mitra.create({
      data: {
        tiket_id: tiket.tiket_id,
        kode_tiket: tiket.kode_tiket,
        project_id: tiket.project_id,
        jenis_laporan: "migrasi_sistem",
        tanggal_laporan: new Date(),
        mos,
        used,
        catatan: "Data migrasi otomatis dari sistem lama — belum dikonfirmasi mitra",
        uploaded_by: BigInt(actorId || 0),
        is_aktif: true,
      },
    });

    affectedTiketIds.push(String(tiket.tiket_id));
  }

  for (const tiketId of affectedTiketIds) {
    await reconciliationService.refreshTiketMosUsed(tiketId, prisma);
  }

  return { updated: affectedTiketIds.length };
};

const getReconciliationUploadLogs = async (filters = {}) => {
  const {
    search = "",
    actorId = "all",
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = filters;

  const where = {};

  if (search.trim()) {
    const s = search.trim();
    const matchedAksi = AUDIT_AKSI_VALUES.filter((aksi) =>
      aksi.toLowerCase().includes(s.toLowerCase())
    );
    where.OR = [
      { entity_type: { contains: s, mode: "insensitive" } },
      { actor: { nama: { contains: s, mode: "insensitive" } } },
      ...(matchedAksi.length > 0 ? [{ aksi: { in: matchedAksi } }] : []),
    ];
  }

  if (actorId !== "all") {
    where.uploaded_by = BigInt(actorId);
  }

  if (startDate || endDate) {
    where.uploaded_at = {};
    if (startDate) where.uploaded_at.gte = new Date(startDate);
    if (endDate) where.uploaded_at.lte = new Date(endDate + "T23:59:59");
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.reconciliation_upload_log.findMany({
      where,
      skip: Number(skip),
      take: Number(limit),
      orderBy: { uploaded_at: "desc" },
      include: {
        actor: {
          select: {
            user_id: true,
            nama: true,
            email: true,
            role: true,
          },
        },
        details: {
          orderBy: { detail_id: "asc" },
        },
      },
    }),
    prisma.reconciliation_upload_log.count({ where }),
  ]);

  const rows = data.map((log) => ({
    upload_id: String(log.upload_id),
    filename: log.filename,
    file_url: log.file_url,
    uploaded_at: log.uploaded_at,
    uploaded_by: String(log.uploaded_by),
    uploaded_by_nama: log.actor?.nama || "-",
    uploaded_by_role: log.actor?.role || "-",
    total_rows: log.total_rows,
    success_rows: log.success_rows,
    failed_rows: log.failed_rows,
    details: log.details.map((d) => ({
      detail_id: String(d.detail_id),
      kode_tiket: d.kode_tiket,
      mos: d.mos ? Number(d.mos) : 0,
      used: d.used ? Number(d.used) : 0,
      status: d.status,
      reason: d.reason,
    })),
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

module.exports = {
  getStockHistory,
  getStockHistoryForExport,
  getAuditLogs,
  getAuditLogForExport,
  getHardwareReconciliation,
  getHardwareReconciliationPerTiket,
  getHardwareReconciliationDetailed,
  getZoneUtilizationHistory,
  getZoneUtilization,
  backfillReconciliation,
  getReconciliationUploadLogs,
};
