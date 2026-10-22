const warehouseRepository = require("./warehouse.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const notificationService = require("../../modules/notifications/notifications.service");
const { createAuditLog } = require("../../utils/audit-log");

const canEditType = async (gudang_id) => {
  const warehouse = await warehouseRepository.findById(gudang_id);

  if (!warehouse) {
    throw new AppError("Warehouse tidak ditemukan.", 404);
  }

  const [zonaCount, stockExists] = await Promise.all([
    prisma.zona_gudang.count({
      where: { gudang_id: warehouse.gudang_id },
    }),
    prisma.stok_gudang.findFirst({
      where: {
        gudang_id: warehouse.gudang_id,
        qty: { gt: 0 },
      },
      select: { stok_id: true },
    }),
  ]);

  return {
    dapat_ubah_tipe: zonaCount <= 1 && !stockExists,
    zona_count: zonaCount,
    has_stock: Boolean(stockExists),
  };
};

const create = async (data, userId, userRole) => {
  if (data.tipe === "dadakan" && userRole !== "admin_general") {
    throw new AppError("Hanya Admin yang dapat membuat Gudang Dadakan.", 403);
  }

  const existingWarehouse = await warehouseRepository.findByNama(data.nama_gudang, {
    includeInactive: true,
  });

  if (existingWarehouse) {
    throw new AppError("Nama warehouse sudah digunakan.", 400);
  }

  const createData = {
    ...data,
    tipe: data.tipe || "tetap",
    created_by: Number(userId),
    updated_by: Number(userId),
  };

  const defaultZonaLayout = [
    { kode_zona: "A", nama_zona: "Zona A", tipe_zona: "Indoor", status_kecukupan: "CUKUP" },
    { kode_zona: "B", nama_zona: "Zona B", tipe_zona: "Indoor", status_kecukupan: "CUKUP" },
    { kode_zona: "C", nama_zona: "Zona C", tipe_zona: "Outdoor", status_kecukupan: "CUKUP" },
    { kode_zona: "D", nama_zona: "Zona D", tipe_zona: "Outdoor", status_kecukupan: "CUKUP" },
  ];

  const dadakanZonaLayout = [
    { kode_zona: "DEFAULT", nama_zona: "Area Utama", tipe_zona: "Indoor", status_kecukupan: "CUKUP" },
  ];

  const zonaLayout = createData.tipe === "dadakan" ? dadakanZonaLayout : defaultZonaLayout;

  const result = await prisma.$transaction(async (tx) => {
    const warehouse = await tx.gudang.create({
      data: createData,
    });

    for (const zona of zonaLayout) {
      await tx.zona_gudang.create({
        data: {
          gudang_id: warehouse.gudang_id,
          kode_zona: zona.kode_zona,
          nama_zona: zona.nama_zona,
          tipe_zona: zona.tipe_zona,
          status_kecukupan: zona.status_kecukupan,
        },
      });
    }

    await createAuditLog(
      {
        entityType: "warehouse",
        entityId: warehouse.gudang_id,
        aksi: "create",
        actorId: userId,
        dataSebelum: null,
        dataSesudah: warehouse,
      },
      tx
    );

    return warehouse;
  });

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(userId) },
    select: { nama: true },
  });

  try {
    const roles = ["admin_general", "supervisor"];
    for (const role of roles) {
      await notificationService.create({
        role,
        type: "info",
        title: "Gudang Baru Ditambahkan",
        message: `Gudang baru: ${result.nama_gudang} (ID: ${result.gudang_id}) telah ditambahkan oleh ${actor?.nama || "Staf"}.`,
        link: "/dashboard/master-data",
      });
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi gudang baru:", notifErr);
  }

  if (result.project_id) {
    try {
      const project = await prisma.project.findUnique({
        where: { project_id: result.project_id },
        select: { nama_project: true },
      });

      const roles = ["admin_general", "supervisor"];
      for (const role of roles) {
        await notificationService.create({
          role,
          type: "info",
          title: "Gudang Dikaitkan dengan Project",
          message: `Gudang ${result.nama_gudang} telah dikaitkan dengan Project ${project?.nama_project || result.project_id}.`,
          link: "/dashboard/master-data",
        });
      }
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi create warehouse project assignment:", notifErr);
    }
  }

  return result;
};

const findAll = async (query) => {
  const result = await warehouseRepository.findAll(query);

  // Flag `dapat_ubah_tipe` dihitung per gudang. Sebelumnya memakai canEditType()
  // untuk tiap baris (2 query x N gudang); sekarang limit default gudang jauh lebih
  // besar, jadi cukup dihitung sekali lewat dua query agregat.
  const gudangIds = result.data.map((warehouse) => warehouse.gudang_id);

  if (gudangIds.length === 0) {
    return { ...result, data: [] };
  }

  const [zonaCounts, gudangBerstok] = await Promise.all([
    prisma.zona_gudang.groupBy({
      by: ["gudang_id"],
      where: { gudang_id: { in: gudangIds } },
      _count: { _all: true },
    }),
    prisma.stok_gudang.groupBy({
      by: ["gudang_id"],
      where: { gudang_id: { in: gudangIds }, qty: { gt: 0 } },
    }),
  ]);

  const zonaCountMap = new Map(
    zonaCounts.map((row) => [String(row.gudang_id), row._count._all])
  );
  const gudangBerstokSet = new Set(gudangBerstok.map((row) => String(row.gudang_id)));

  const dataWithFlag = result.data.map((warehouse) => {
    const zonaCount = zonaCountMap.get(String(warehouse.gudang_id)) || 0;
    const hasStock = gudangBerstokSet.has(String(warehouse.gudang_id));

    return {
      ...warehouse,
      dapat_ubah_tipe: zonaCount <= 1 && !hasStock,
    };
  });

  return {
    ...result,
    data: dataWithFlag,
  };
};

const findByNama = async (nama_gudang) => {
  const warehouse = await warehouseRepository.findByNama(nama_gudang, {
    includeInactive: true,
  });

  if (!warehouse) {
    throw new AppError("Warehouse tidak ditemukan.", 404);
  }

  const check = await canEditType(warehouse.gudang_id);

  return {
    ...warehouse,
    dapat_ubah_tipe: check.dapat_ubah_tipe,
  };
};

const update = async (gudang_id, data, userId) => {
  const warehouse = await warehouseRepository.findByNama(gudang_id, {
    includeInactive: true,
  });

  if (!warehouse) {
    throw new AppError("Warehouse tidak ditemukan.", 404);
  }

  if (!warehouse.is_aktif) {
    throw new AppError("Warehouse telah dinonaktifkan. Pulihkan untuk mengubah data.", 400);
  }

  if (data.is_aktif === false && warehouse.is_aktif) {
    const stockExists = await hasActiveStock(warehouse.gudang_id);

    if (stockExists) {
      throw new AppError("Gudang tidak dapat dinonaktifkan karena masih memiliki stok.", 400);
    }
  }

  if (data.tipe && data.tipe !== warehouse.tipe) {
    const check = await canEditType(warehouse.gudang_id);

    if (!check.dapat_ubah_tipe) {
      throw new AppError("Tipe gudang tidak dapat diubah karena sudah memiliki stok atau lebih dari 1 zona.", 400);
    }
  }

  if (data.nama_gudang && data.nama_gudang !== warehouse.nama_gudang) {
    const existingWarehouse = await warehouseRepository.findByNama(data.nama_gudang, {
      includeInactive: true,
    });

    if (existingWarehouse) {
      throw new AppError("Nama warehouse sudah digunakan.", 400);
    }
  }

  const updateData = {
    ...data,
    updated_by: Number(userId),
  };

  const result = await warehouseRepository.update(warehouse.gudang_id, updateData);

  const previousProjectId = warehouse.project_id;
  const newProjectId = result.project_id;

  if (newProjectId && newProjectId !== previousProjectId) {
    try {
      const project = await prisma.project.findUnique({
        where: { project_id: newProjectId },
        select: { nama_project: true },
      });

      const personnel = await prisma.personil.findMany({
        where: {
          gudang_id: warehouse.gudang_id,
          user: {
            role: { in: ["supervisor", "staf_gudang"] },
            is_aktif: true,
          },
        },
        select: { user_id: true },
      });

      const userIds = personnel
        .map((p) => p.user_id)
        .filter((id) => id != null);

      for (const uid of userIds) {
        await notificationService.create({
          userId: uid,
          type: "info",
          title: "Gudang Dikaitkan dengan Project",
          message: `Gudang ${result.nama_gudang} telah dikaitkan dengan Project ${project?.nama_project || newProjectId}.`,
          link: "/dashboard/master-data",
        });
      }
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi project assignment warehouse:", notifErr);
    }
  }

  try {
    const [supervisors, staff] = await Promise.all([
      prisma.user_account.findMany({
        where: { role: "supervisor", is_aktif: true },
        select: { user_id: true },
      }),
      prisma.personil.findMany({
        where: {
          gudang_id: warehouse.gudang_id,
          user: {
            role: { in: ["staf_gudang"] },
            is_aktif: true,
          },
        },
        select: { user_id: true },
      }),
    ]);

    const userIds = [
      ...supervisors.map((s) => s.user_id).filter((id) => id != null),
      ...staff.map((p) => p.user_id).filter((id) => id != null),
    ];

    for (const uid of userIds) {
      await notificationService.create({
        userId: uid,
        type: "info",
        title: "Gudang Diperbarui",
        message: `Gudang ${warehouse.nama_gudang} telah diperbarui.`,
        link: "/dashboard/master-data",
      });
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi update warehouse:", notifErr);
  }

  return result;
};

const hasActiveStock = async (gudang_id) => {
  const stock = await prisma.stok_gudang.findFirst({
    where: {
      gudang_id,
      qty: { gt: 0 },
    },
    select: { stok_id: true },
  });

  return Boolean(stock);
};

const softDelete = async (gudang_id) => {
  const warehouse = await warehouseRepository.findById(gudang_id);

  if (!warehouse) {
    throw new AppError("Gudang tidak ditemukan.", 404);
  }

  const stockExists = await hasActiveStock(warehouse.gudang_id);

  if (stockExists) {
    throw new AppError("Gudang tidak dapat dinonaktifkan karena masih memiliki stok.", 400);
  }

  const result = await warehouseRepository.softDelete(warehouse.gudang_id);

  try {
    await createAuditLog(
      {
        entityType: "gudang",
        entityId: warehouse.gudang_id,
        aksi: "soft_delete",
        actorId: warehouse.updated_by,
        dataSebelum: { is_aktif: true },
        dataSesudah: { is_aktif: false },
      },
      prisma
    );
  } catch (auditErr) {
    console.error("Gagal membuat audit log soft_delete gudang:", auditErr);
  }

  return result;
};

const restore = async (gudang_id) => {
  const warehouse = await warehouseRepository.findById(gudang_id);

  if (!warehouse) {
    throw new AppError("Gudang tidak ditemukan.", 404);
  }

  if (warehouse.is_aktif) {
    throw new AppError("Gudang sudah aktif.", 400);
  }

  const result = await warehouseRepository.restore(gudang_id);

  try {
    await createAuditLog(
      {
        entityType: "gudang",
        entityId: warehouse.gudang_id,
        aksi: "restore",
        actorId: warehouse.updated_by,
        dataSebelum: { is_aktif: false },
        dataSesudah: { is_aktif: true },
      },
      prisma
    );
  } catch (auditErr) {
    console.error("Gagal membuat audit log restore gudang:", auditErr);
  }

  return result;
};

const getLayout = async (gudang_id) => {
  const warehouse = await warehouseRepository.findById(gudang_id);

  if (!warehouse) {
    throw new AppError("Warehouse tidak ditemukan.", 404);
  }

  const zonas = await prisma.zona_gudang.findMany({
    where: { gudang_id: warehouse.gudang_id },
    include: {
      dinilai_oleh_user: {
        select: {
          nama: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { kode_zona: "asc" },
  });

  const stockAgg = await prisma.stok_gudang.groupBy({
    by: ["zona_id"],
    where: {
      gudang_id: warehouse.gudang_id,
      zona_id: { not: null },
    },
    _sum: { qty: true },
    _count: { barang_id: true },
  });

  const zoneStats = {};
  zonas.forEach((z) => {
    zoneStats[z.zona_id] = { total_qty: 0, total_item: 0 };
  });

  stockAgg.forEach((s) => {
    if (zoneStats[s.zona_id]) {
      zoneStats[s.zona_id].total_qty += Number(s._sum.qty || 0);
      zoneStats[s.zona_id].total_item += s._count.barang_id;
    }
  });

  const gudangKapasitasMaksimum = warehouse.kapasitas_maksimum != null ? Number(warehouse.kapasitas_maksimum) : null;

  return {
    ...warehouse,
    kapasitas_maksimum: gudangKapasitasMaksimum,
    zonas: zonas.map((z) => {
      const kapasitasMaksimum = z.kapasitas_maksimum != null ? Number(z.kapasitas_maksimum) : null;
      const totalQty = zoneStats[z.zona_id]?.total_qty || 0;
      const sisa = kapasitasMaksimum != null ? kapasitasMaksimum - totalQty : null;

      return {
        ...z,
        kapasitas_maksimum: kapasitasMaksimum,
        gudang_kapasitas_maksimum: gudangKapasitasMaksimum,
        total_qty: totalQty,
        total_item: zoneStats[z.zona_id]?.total_item || 0,
        sisa,
        status_kecukupan_source: z.status_kecukupan_source || "AUTO",
        kapasitas_belum_diatur: kapasitasMaksimum == null,
        dinilai_oleh: z.dinilai_oleh_user?.nama || null,
        dinilai_pada: z.dinilai_pada ? z.dinilai_pada.toISOString() : null,
      };
    }),
  };
};

const getZoneStockSnapshot = async (gudang_id, zona_id, query = {}) => {
  const warehouse = await warehouseRepository.findById(gudang_id);

  if (!warehouse) {
    throw new AppError("Warehouse tidak ditemukan.", 404);
  }

  const search = (query.search || "").trim();
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const baseWhere = {
    gudang_id: Number(gudang_id),
    zona_id: Number(zona_id),
  };

  let barangIdFilter = undefined;

  if (search) {
    const matchingBarangs = await prisma.barang.findMany({
      where: {
        is_aktif: true,
        OR: [
          { kode_perangkat: { contains: search, mode: "insensitive" } },
          { nama_barang: { contains: search, mode: "insensitive" } },
        ],
      },
      select: { barang_id: true },
    });

    barangIdFilter = matchingBarangs.map((b) => b.barang_id);

    if (barangIdFilter.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 1,
        },
      };
    }
  }

  const stockWhere = {
    ...baseWhere,
    ...(barangIdFilter && { barang_id: { in: barangIdFilter } }),
  };

  const grouped = await prisma.stok_gudang.groupBy({
    by: ["barang_id", "zona_id", "kondisi"],
    where: stockWhere,
    _sum: { qty: true },
  });

  const barangIds = [...new Set(grouped.map((g) => g.barang_id))];
  const zonaIds = [...new Set(grouped.map((g) => g.zona_id).filter(Boolean))];

  const [barangs, zonas] = await Promise.all([
    prisma.barang.findMany({
      where: { barang_id: { in: barangIds }, is_aktif: true },
      select: {
        barang_id: true,
        kode_perangkat: true,
        nama_barang: true,
        kategori: { select: { nama_kategori: true } },
        satuan_default: { select: { kode_satuan: true } },
      },
    }),
    prisma.zona_gudang.findMany({
      where: { zona_id: { in: zonaIds } },
      select: {
        zona_id: true,
        kode_zona: true,
        nama_zona: true,
      },
    }),
  ]);

  const barangMap = new Map(barangs.map((b) => [Number(b.barang_id), b]));
  const zonaMap = new Map(zonas.map((z) => [Number(z.zona_id), z]));

  const sorted = grouped.sort((a, b) => {
    const aCode = barangMap.get(Number(a.barang_id))?.kode_perangkat || "";
    const bCode = barangMap.get(Number(b.barang_id))?.kode_perangkat || "";
    return aCode.localeCompare(bCode);
  });

  const total = sorted.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const paged = sorted.slice(start, start + limit);

  const rows = paged.map((item) => {
    const barang = barangMap.get(Number(item.barang_id));
    const zona = item.zona_id ? zonaMap.get(Number(item.zona_id)) : null;
    return {
      snapshot_id: `${item.barang_id}-${item.zona_id}-${item.kondisi}`,
      barang_id: Number(item.barang_id),
      kode_perangkat: barang?.kode_perangkat || "-",
      nama_barang: barang?.nama_barang || "-",
      kategori: barang?.kategori?.nama_kategori || "-",
      satuan: barang?.satuan_default?.kode_satuan || "-",
      kondisi: item.kondisi,
      qty: Number(item._sum.qty || 0),
      zona_id: item.zona_id ? Number(item.zona_id) : null,
      kode_zona: zona?.kode_zona || "-",
      nama_zona: zona?.nama_zona || "-",
    };
  });

  return {
    data: rows,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

const getStockCheck = async (gudang_id, query = {}) => {
  let items = [];
  if (Array.isArray(query.items)) {
    items = query.items;
  } else if (typeof query.items === "string" && query.items.trim()) {
    try {
      items = JSON.parse(query.items);
    } catch {
      items = [];
    }
  }

  const projectId = query.project_id ? Number(query.project_id) : null;

  if (!Array.isArray(items) || !items.length) {
    return [];
  }

  return await warehouseRepository.getStockAvailability(gudang_id, items, projectId);
};

const getPickingStockCheck = async (gudang_id, query = {}) => {
  let items = [];
  if (Array.isArray(query.items)) {
    items = query.items;
  } else if (typeof query.items === "string" && query.items.trim()) {
    try {
      items = JSON.parse(query.items);
    } catch {
      items = [];
    }
  }

  const projectId = query.project_id ? Number(query.project_id) : null;

  if (!Array.isArray(items) || !items.length) {
    return [];
  }

  return await warehouseRepository.getPickingStockAvailability(gudang_id, items, projectId);
};

const getPickingAvailability = async (gudang_id, query = {}) => {
  let items = [];
  if (Array.isArray(query.items)) {
    items = query.items;
  } else if (typeof query.items === "string" && query.items.trim()) {
    try {
      items = JSON.parse(query.items);
    } catch {
      items = [];
    }
  }

  const projectId = query.project_id ? Number(query.project_id) : null;

  if (!Array.isArray(items) || !items.length) {
    return [];
  }

  return await warehouseRepository.getPickingAvailability(gudang_id, items, projectId);
};

module.exports = {
  create,
  findAll,
  findByNama,
  update,
  softDelete,
  restore,
  getLayout,
  getZoneStockSnapshot,
  getStockCheck,
  getPickingStockCheck,
  getPickingAvailability,
};
