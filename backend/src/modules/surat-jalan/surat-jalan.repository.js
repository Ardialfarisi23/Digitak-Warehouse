const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");

const baseInclude = {
  items: {
    include: {
      barang: {
        include: {
          satuan_default: true,
        },
      },
      satuan: {
        select: {
          satuan_id: true,
          kode_satuan: true,
        },
      },
    },
  },
  boq: {
    include: {
      tiket: true,
      items: {
        include: {
          barang: {
            include: {
              satuan_default: true,
            },
          },
          satuan: {
            select: {
              satuan_id: true,
              kode_satuan: true,
            },
          },
        },
      },
    },
  },
  gudang_asal: true,
  gudang_tujuan: true,
  kendaraan: true,
  personil_pengantar: true,
  project: true,
   creator: true,
};

const APPROVAL_STATUS = "draft_diajukan";
const DELIVERY_STATUSES = ["disetujui", "digenerate", "diterima_didistribusikan"];

function applyListFilters(where, params = {}) {
  const { kategori_approval, search, startDate, endDate } = params;

  if (kategori_approval && kategori_approval !== "all") {
    where.kategori_approval = kategori_approval;
  }

  if (search) {
    where.OR = [
      { nomor_surat_jalan: { contains: search, mode: "insensitive" } },
      { boq: { boq_number: { contains: search, mode: "insensitive" } } },
      { boq: { tiket: { kode_tiket: { contains: search, mode: "insensitive" } } } },
    ];
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(startDate);
    if (endDate) where.created_at.lte = new Date(endDate);
  }

  return where;
}

function sanitizePagination(page, limit) {
  const sanitizedPage = Math.max(parseInt(page, 10) || 1, 1);
  const sanitizedLimit = Math.max(parseInt(limit, 10) || 10, 1);
  return { page: sanitizedPage, limit: sanitizedLimit };
}

const buildListMeta = (total, { page, limit }) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

const create = async (data, actorId) => {
  const count = await prisma.surat_jalan.count();
  const year = new Date().getFullYear();
  const nomor = data.nomor_surat_jalan?.trim() || `001/SJ/${data.tipe.toUpperCase()}/DIGITAK/${String(year).slice(-2)}/${String(count + 1).padStart(3, "0")}`;

  const status = data.status || (data.tipe === "inbound" ? "menunggu_verifikasi" : "draft_diajukan");
  const tanggal = data.tanggal ? new Date(data.tanggal) : new Date();

  const suratJalan = await prisma.surat_jalan.create({
    data: {
      nomor_surat_jalan: nomor,
      tipe: data.tipe,
      boq_id: data.boq_id || null,
      gudang_asal_id: data.gudang_asal_id ? Number(data.gudang_asal_id) : null,
      gudang_tujuan_id: data.gudang_tujuan_id ? Number(data.gudang_tujuan_id) : null,
      kendaraan_id: data.kendaraan_id ? Number(data.kendaraan_id) : null,
      personil_pengantar_id: data.personil_pengantar_id ? Number(data.personil_pengantar_id) : null,
      status: status,
      kategori_approval: data.kategori_approval || null,
      project_id: data.project_id ? Number(data.project_id) : null,
      surat_jalan_url: data.surat_jalan_url || null,
      tanggal: tanggal,
      created_by: Number(actorId),
      updated_by: Number(actorId),
      items: {
        create: data.items.map((item) => ({
          barang_id: Number(item.barang_id),
          qty: Number(item.qty),
          satuan_id: Number(item.satuan_id),
          kondisi: item.kondisi || null,
          serial_number: item.serial_number || null,
          foto_url: item.foto_url || null,
          is_kelebihan: Boolean(item.is_kelebihan),
          catatan: item.catatan || null,
          bin_lokasi_id: item.bin_lokasi_id ? Number(item.bin_lokasi_id) : null,
        })),
      },
    },
    include: baseInclude,
  });

  return suratJalan;
};

const findOutboundQueue = async () => {
  return await prisma.surat_jalan.findMany({
    where: {
      tipe: "outbound",
      status: {
        in: ["draft_diajukan", "disetujui", "digenerate"],
      },
    },
    include: baseInclude,
    orderBy: [{ updated_at: "desc" }],
  });
};

const findInboundList = async () => {
  return await prisma.surat_jalan.findMany({
    where: {
      tipe: "inbound",
      status: {
        in: ["draft_diajukan", "menunggu_verifikasi", "ready_putaway", "disetujui", "digenerate"],
      },
    },
    include: baseInclude,
    orderBy: [{ updated_at: "desc" }],
  });
};

const findVerificationQueue = async ({ status, tipe, kategori_approval, search, startDate, endDate, page = 1, limit = 10 } = {}) => {
  const where = {};

  if (status) {
    where.status = status;
  } else {
    where.status = "draft_diajukan";
  }

  if (tipe && ["inbound", "outbound"].includes(tipe)) {
    where.tipe = tipe;
  }

  applyListFilters(where, { kategori_approval, search, startDate, endDate });

  const { page: sanitizedPage, limit: sanitizedLimit } = sanitizePagination(page, limit);

  const [total, data] = await Promise.all([
    prisma.surat_jalan.count({ where }),
    prisma.surat_jalan.findMany({
      where,
      include: baseInclude,
      orderBy: [{ created_at: "desc" }],
      skip: (sanitizedPage - 1) * sanitizedLimit,
      take: sanitizedLimit,
    }),
  ]);

  return { data, meta: buildListMeta(total, { page: sanitizedPage, limit: sanitizedLimit }) };
};

const findOutboundForApproval = async (params = {}) => {
  const { kategori_approval, search, startDate, endDate, page, limit } = params;

  const where = applyListFilters(
    { tipe: "outbound", status: APPROVAL_STATUS },
    { kategori_approval, search, startDate, endDate }
  );

  const { page: sanitizedPage, limit: sanitizedLimit } = sanitizePagination(page, limit);

  const [total, data] = await Promise.all([
    prisma.surat_jalan.count({ where }),
    prisma.surat_jalan.findMany({
      where,
      include: baseInclude,
      orderBy: [{ created_at: "desc" }],
      skip: (sanitizedPage - 1) * sanitizedLimit,
      take: sanitizedLimit,
    }),
  ]);

  return { data, meta: buildListMeta(total, { page: sanitizedPage, limit: sanitizedLimit }) };
};

const findOutboundForDelivery = async (params = {}) => {
  const { search, startDate, endDate, page, limit } = params;

  const where = applyListFilters(
    { tipe: "outbound", status: { in: DELIVERY_STATUSES } },
    { search, startDate, endDate }
  );

  const { page: sanitizedPage, limit: sanitizedLimit } = sanitizePagination(page, limit);

  const [total, data] = await Promise.all([
    prisma.surat_jalan.count({ where }),
    prisma.surat_jalan.findMany({
      where,
      include: baseInclude,
      orderBy: [{ updated_at: "desc" }],
      skip: (sanitizedPage - 1) * sanitizedLimit,
      take: sanitizedLimit,
    }),
  ]);

  return { data, meta: buildListMeta(total, { page: sanitizedPage, limit: sanitizedLimit }) };
};

const findById = async (id) => {
  return await prisma.surat_jalan.findUnique({
    where: {
      surat_jalan_id: Number(id),
    },
    include: baseInclude,
  });
};

const updateStatus = async (id, status, tx = prisma) => {
  const data = {
    status,
  };

  if (status === "disetujui") {
    data.tanggal_disetujui = new Date();
  }

  if (status === "diterima_didistribusikan") {
    data.tanggal_diterima = new Date();
  }

  return await tx.surat_jalan.update({
    where: {
      surat_jalan_id: Number(id),
    },
    data,
  });
};

const updateInboundItems = async (adjustments) => {
  for (const item of adjustments) {
    await prisma.surat_jalan_item.update({
      where: {
        item_id: Number(item.item_id),
      },
      data: {
        catatan: item.catatan || null,
      },
    });
  }
};

const addInboundStock = async (suratJalan, tx = prisma) => {
  const gudangTujuanId = Number(suratJalan.gudang_tujuan_id);

  if (!gudangTujuanId) {
    throw new AppError("Gudang tujuan tidak tersedia untuk penambahan stok.", 400);
  }

  for (const item of suratJalan.items) {
    const qty = Number(item.qty || 0);

    if (qty <= 0) {
      continue;
    }

    const existingStock = await tx.stok_gudang.findFirst({
      where: {
        gudang_id: gudangTujuanId,
        barang_id: item.barang_id,
        kondisi: "baik",
        bin_lokasi_id: null,
        project_id: suratJalan.project_id,
      },
    });

    if (existingStock) {
      const newQty = Number(existingStock.qty || 0) + qty;

      await tx.stok_gudang.update({
        where: {
          stok_id: existingStock.stok_id,
        },
        data: {
          qty: newQty,
          updated_at: new Date(),
        },
      });

      await tx.stok_ledger.create({
        data: {
          surat_jalan_item_id: item.item_id,
          barang_id: item.barang_id,
          jenis_mutasi: "in",
          qty: qty,
          saldo_setelah: newQty,
        },
      });
    } else {
      const newStock = await tx.stok_gudang.create({
        data: {
          gudang_id: gudangTujuanId,
          barang_id: item.barang_id,
          project_id: suratJalan.project_id,
          kondisi: "baik",
          qty: qty,
          bin_lokasi_id: null,
        },
      });

      await tx.stok_ledger.create({
        data: {
          surat_jalan_item_id: item.item_id,
          barang_id: item.barang_id,
          jenis_mutasi: "in",
          qty: qty,
          saldo_setelah: Number(newStock.qty),
        },
      });
    }
  }
};

const createApprovalLog = async (suratJalanId, approverId, tahap, approvalStatus, catatan = null, tx = prisma) => {
  await tx.approval_log.create({
    data: {
      entity_type: "surat_jalan",
      entity_id: Number(suratJalanId),
      tahap: tahap,
      status: approvalStatus,
      approver_id: Number(approverId),
      catatan: catatan || null,
    },
  });
};

const deductOutboundStock = async (suratJalan, tx = prisma) => {
  const gudangAsalId = Number(suratJalan.gudang_asal_id);

  if (!gudangAsalId) {
    throw new AppError("Gudang asal tidak tersedia untuk pemotongan stok.", 400);
  }

  const gudangAsal = suratJalan.gudang_asal;
  const gudangAsalNama = gudangAsal?.nama_gudang || `Gudang ID ${gudangAsalId}`;

  for (const item of suratJalan.items) {
    const qty = Number(item.qty || 0);

    if (qty <= 0) {
      continue;
    }

    const barang = item.barang;
    const barangNama = barang?.nama_barang || barang?.kode_perangkat || `Barang ID ${item.barang_id}`;

    const stockWhere = {
      gudang_id: gudangAsalId,
      barang_id: item.barang_id,
      kondisi: "baik",
    };

    if (suratJalan.project_id) {
      stockWhere.project_id = suratJalan.project_id;
    }

    if (item.bin_lokasi_id) {
      stockWhere.bin_lokasi_id = item.bin_lokasi_id;
    }

    let stockRecord = await tx.stok_gudang.findFirst({
      where: {
        ...stockWhere,
        bin_lokasi_id: { not: null },
      },
      orderBy: {
        qty: "desc",
      },
    });

    if (!stockRecord) {
      stockRecord = await tx.stok_gudang.findFirst({
        where: stockWhere,
        orderBy: {
          qty: "desc",
        },
      });
    }

    if (!stockRecord) {
      throw new AppError(
        `Stok barang ${barangNama} di ${gudangAsalNama} tidak ditemukan.`,
        400
      );
    }

    const existingQty = Number(stockRecord.qty || 0);
    if (existingQty < qty) {
      throw new AppError(
        `Stok barang ${barangNama} di ${gudangAsalNama} tidak mencukupi (Tersedia: ${existingQty}, Dibutuhkan: ${qty}).`,
        400
      );
    }

    const updatedQty = existingQty - qty;

    await tx.stok_gudang.update({
      where: {
        stok_id: stockRecord.stok_id,
      },
      data: {
        qty: updatedQty,
        updated_at: new Date(),
      },
    });

    await tx.stok_ledger.create({
      data: {
        surat_jalan_item_id: item.item_id,
        barang_id: item.barang_id,
        jenis_mutasi: "out",
        qty: qty,
        saldo_setelah: updatedQty,
      },
    });
  }
};

const reduceBoqAllocation = async (suratJalan, tx = prisma) => {
  if (!suratJalan.boq_id || !suratJalan.boq?.items?.length) {
    return;
  }

  const barangToQty = new Map();

  for (const item of suratJalan.items) {
    const qty = Number(item.qty || 0);
    if (qty <= 0) continue;
    const current = barangToQty.get(item.barang_id) || 0;
    barangToQty.set(item.barang_id, current + qty);
  }

  for (const [barangId, totalQty] of barangToQty) {
    const boqItem = suratJalan.boq.items.find(
      (bi) => Number(bi.barang_id) === Number(barangId)
    );
    if (!boqItem) continue;

    const currentQty = Number(boqItem.qty_rencana || 0);
    const newQty = currentQty - totalQty;

    if (newQty < 0) {
      throw new AppError(
        `Sisa alokasi BOQ untuk barang ${barangId} tidak mencukupi. Sisa: ${currentQty}, Dibutuhkan: ${totalQty}.`,
        400
      );
    }

    await tx.boq_item.update({
      where: { boq_item_id: Number(boqItem.boq_item_id) },
      data: { qty_rencana: newQty },
    });
  }
};

module.exports = {
  create,
  findOutboundQueue,
  findInboundList,
  findById,
  findVerificationQueue,
  findOutboundForApproval,
  findOutboundForDelivery,
  updateStatus,
  updateInboundItems,
  deductOutboundStock,
  addInboundStock,
  createApprovalLog,
  reduceBoqAllocation,
};
