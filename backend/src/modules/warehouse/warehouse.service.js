const warehouseRepository = require("./warehouse.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");

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

  return await warehouseRepository.update(warehouse.gudang_id, updateData);
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
    where: { gudang_id: Number(gudang_id) },
    include: {
      raks: {
        include: {
          bins: true,
        },
      },
    },
    orderBy: { kode_zona: "asc" },
  });

  return {
    ...warehouse,
    zonas: zonas.map((z) => ({
      ...z,
      raks: z.raks.map((r) => ({
        ...r,
        bins: r.bins.sort((a, b) => a.kode_bin.localeCompare(b.kode_bin)),
      })),
    })),
  };
};

const getZoneStockSnapshot = async (gudang_id, zona_id, query = {}) => {
  const search = (query.search || "").trim();
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const baseWhere = {
    gudang_id: Number(gudang_id),
    bin_lokasi: {
      rak: {
        zona_id: Number(zona_id),
      },
    },
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
        bin_lokasi: {
          include: {
            rak: {
              include: {
                zona: {
                  select: {
                    zona_id: true,
                    kode_zona: true,
                    nama_zona: true,
                  },
                },
              },
            },
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
    bin_lokasi_id: item.bin_lokasi_id || null,
    kode_bin: item.bin_lokasi?.kode_bin || "-",
    kode_rak: item.bin_lokasi?.rak?.kode_rak || "-",
    zona_id: item.bin_lokasi?.rak?.zona?.zona_id || null,
    kode_zona: item.bin_lokasi?.rak?.zona?.kode_zona || "-",
    nama_zona: item.bin_lokasi?.rak?.zona?.nama_zona || "-",
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
