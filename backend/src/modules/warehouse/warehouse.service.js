const warehouseRepository = require("./warehouse.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const notificationService = require("../../modules/notifications/notifications.service");

const create = async (data, userId) => {
  const existingWarehouse = await warehouseRepository.findByNama(data.nama_gudang, {
    includeInactive: true,
  });

  if (existingWarehouse) {
    throw new AppError("Nama warehouse sudah digunakan.", 400);
  }

  const createData = {
    ...data,
    created_by: Number(userId),
    updated_by: Number(userId),
  };

  return await warehouseRepository.create(createData);
};

const findAll = async (query) => {
  return await warehouseRepository.findAll(query);
};

const findByNama = async (nama_gudang) => {
  const warehouse = await warehouseRepository.findByNama(nama_gudang, {
    includeInactive: true,
  });

  if (!warehouse) {
    throw new AppError("Warehouse tidak ditemukan.", 404);
  }

  return warehouse;
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

const softDelete = async (gudang_id) => {
  return await warehouseRepository.softDelete(gudang_id);
};

const restore = async (gudang_id) => {
  return await warehouseRepository.restore(gudang_id);
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

  const [data, total] = await Promise.all([
    prisma.stok_gudang.findMany({
      where: stockWhere,
      skip,
      take: limit,
      orderBy: { barang: { kode_perangkat: "asc" } },
      include: {
        barang: {
          select: {
            barang_id: true,
            kode_perangkat: true,
            nama_barang: true,
            kategori: {
              select: {
                nama_kategori: true,
              },
            },
            satuan_default: {
              select: {
                kode_satuan: true,
              },
            },
          },
        },
        zona: {
          select: {
            zona_id: true,
            kode_zona: true,
            nama_zona: true,
          },
        },
      },
    }),
    prisma.stok_gudang.count({ where: stockWhere }),
  ]);

  const rows = data.map((item) => ({
    stok_id: item.stok_id,
    barang_id: item.barang_id,
    kode_perangkat: item.barang?.kode_perangkat || "-",
    nama_barang: item.barang?.nama_barang || "-",
    kategori: item.barang?.kategori?.nama_kategori || "-",
    satuan: item.barang?.satuan_default?.kode_satuan || "-",
    kondisi: item.kondisi,
    qty: Number(item.qty),
    zona_id: item.zona_id || null,
    kode_zona: item.zona?.kode_zona || "-",
    nama_zona: item.zona?.nama_zona || "-",
  }));

  return {
    data: rows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
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
};
