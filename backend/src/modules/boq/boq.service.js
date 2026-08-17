const boqRepository = require("./boq.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");

const normalizeStatus = (status) => {
  if (!status) return status;
  const map = {
    DRAFT: "draft",
    AKTIF: "aktif",
    DITOLAK: "ditolak",
  };
  return map[status.toUpperCase()] || status.toLowerCase();
};

const normalizeSource = (source) => {
  if (!source) return "top_down";
  const map = {
    EMAIL_PO: "top_down",
    SUPERVISOR_REQUEST: "bottom_up",
    TOP_DOWN: "top_down",
    BOTTOM_UP: "bottom_up",
  };
  return map[source.toUpperCase()] || source.toLowerCase();
};

const normalizeVerification = (status) => {
  if (!status) return "menunggu";
  const map = {
    VERIFIED: "terverifikasi",
    PENDING: "menunggu",
    NOT_APPLICABLE: "tidak_berlaku",
    MENUNGGU: "menunggu",
    TERVERIFIKASI: "terverifikasi",
  };
  return map[status.toUpperCase()] || status.toLowerCase();
};

const generateBoqNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.boq.count({
    where: {
      boq_number: {
        startsWith: `BOQ-${year}-`,
      },
    },
  });
  return `BOQ-${year}-${String(count + 1).padStart(4, "0")}`;
};

const create = async (data, userId) => {
  const { items, projectId, area, ticketNumber, notes, referenceFile, ...boqData } = data;

  if (!ticketNumber) {
    throw new AppError("Kode tiket wajib diisi.", 400);
  }

  const existingTiket = await prisma.tiket_material.findFirst({
    where: { kode_tiket: ticketNumber },
  });

  let tiket;
  if (existingTiket) {
    tiket = existingTiket;
  } else {
    tiket = await prisma.tiket_material.create({
      data: {
        kode_tiket: ticketNumber,
        project_id: projectId ? Number(projectId) : null,
        area: area || null,
        created_by: userId,
      },
    });
  }

  const boqNumber = await generateBoqNumber();

  const boqDataWithMeta = {
    ...boqData,
    boq_number: boqNumber,
    tiket_id: tiket.tiket_id,
    created_by: userId,
    updated_by: userId,
    status: normalizeStatus(boqData.status),
    source: normalizeSource(boqData.source),
    external_verification_status: normalizeVerification(boqData.external_verification_status),
    catatan: notes || boqData.notes || null,
    reference_file: referenceFile || null,
  };

  delete boqDataWithMeta.externalVerificationStatus;
  delete boqDataWithMeta.notes;
  delete boqDataWithMeta.referenceFile;

  if (items && items.length > 0) {
    const barangMap = new Map();
    if (items.some((item) => item.itemCode && !item.barang_id)) {
      const barangs = await prisma.barang.findMany({
        where: {
          kode_perangkat: {
            in: items.filter((item) => item.itemCode && !item.barang_id).map((item) => item.itemCode),
          },
        },
        select: { barang_id: true, kode_perangkat: true },
      });
      for (const b of barangs) {
        barangMap.set(b.kode_perangkat, b.barang_id);
      }
    }

    const satuanMap = new Map();
    if (items.some((item) => item.unit && !item.satuan_id)) {
      const satuanList = await prisma.satuan.findMany({
        where: {
          kode_satuan: {
            in: items.filter((item) => item.unit && !item.satuan_id).map((item) => item.unit),
          },
        },
        select: { satuan_id: true, kode_satuan: true },
      });
      for (const s of satuanList) {
        satuanMap.set(s.kode_satuan, s.satuan_id);
      }
    }

    const unresolvedItems = items.filter((item) => {
      const barangId = item.barang_id ? Number(item.barang_id) : barangMap.get(item.itemCode);
      return !barangId;
    });

    if (unresolvedItems.length > 0) {
      throw new AppError(`Barang tidak ditemukan untuk: ${unresolvedItems.map((i) => i.itemCode).join(", ")}`, 400);
    }

    boqDataWithMeta.items = {
      create: items.map((item) => {
        const barangId = item.barang_id ? Number(item.barang_id) : (barangMap.get(item.itemCode) || null);
        const satuanId = item.satuan_id ? Number(item.satuan_id) : (satuanMap.get(item.unit) || null);

        return {
          barang_id: barangId,
          qty_rencana: item.quantity || item.qty_rencana || 0,
          satuan_id: satuanId,
          gudang_tujuan_id: item.destinationWarehouseId ? Number(item.destinationWarehouseId) : null,
        };
      }),
    };
  }

  const result = await boqRepository.create(boqDataWithMeta);

  await prisma.audit_log.create({
    data: {
      entity_type: "boq",
      entity_id: BigInt(result.boq_id),
      aksi: "create",
      actor_id: BigInt(userId),
      data_sebelum: null,
      data_sesudah: {
        boq_number: result.boq_number,
        status: result.status,
        tiket_id: result.tiket_id,
        item_count: items?.length || 0,
      },
    },
  });

  return result;
};

const findAll = async (query) => {
  return await boqRepository.findAll(query);
};

const findById = async (id) => {
  const boq = await boqRepository.findById(id);

  if (!boq) {
    throw new AppError("BOQ tidak ditemukan.", 404);
  }

  return boq;
};

const update = async (id, data, userId) => {
  const boq = await boqRepository.findById(id);

  if (!boq) {
    throw new AppError("BOQ tidak ditemukan.", 404);
  }

  if (boq.status === "aktif") {
    throw new AppError("BOQ yang sudah aktif tidak dapat diubah.", 400);
  }

  const { items, projectId, area, ticketNumber, notes, referenceFile, ...boqData } = data;

  const updateData = {
    ...boqData,
    updated_by: userId,
    status: boqData.status ? normalizeStatus(boqData.status) : undefined,
  };

  if (boqData.externalVerificationStatus) {
    updateData.external_verification_status = normalizeVerification(boqData.externalVerificationStatus);
    delete updateData.externalVerificationStatus;
  }

  if (notes !== undefined) {
    updateData.catatan = notes || null;
    delete updateData.notes;
  }

  if (referenceFile !== undefined) {
    updateData.reference_file = referenceFile || null;
    delete updateData.referenceFile;
  }

  if (projectId || area || ticketNumber) {
    const tiketUpdateData = {};
    if (projectId) tiketUpdateData.project_id = Number(projectId);
    if (area) tiketUpdateData.area = area;
    if (ticketNumber) tiketUpdateData.kode_tiket = ticketNumber;

    await prisma.tiket_material.update({
      where: { tiket_id: boq.tiket_id },
      data: tiketUpdateData,
    });
  }

  if (items) {
    const barangMap = new Map();
    if (items.some((item) => item.itemCode && !item.barang_id)) {
      const barangs = await prisma.barang.findMany({
        where: {
          kode_perangkat: {
            in: items.filter((item) => item.itemCode && !item.barang_id).map((item) => item.itemCode),
          },
        },
        select: { barang_id: true, kode_perangkat: true },
      });
      for (const b of barangs) {
        barangMap.set(b.kode_perangkat, b.barang_id);
      }
    }

    const satuanMap = new Map();
    if (items.some((item) => item.unit && !item.satuan_id)) {
      const satuanList = await prisma.satuan.findMany({
        where: {
          kode_satuan: {
            in: items.filter((item) => item.unit && !item.satuan_id).map((item) => item.unit),
          },
        },
        select: { satuan_id: true, kode_satuan: true },
      });
      for (const s of satuanList) {
        satuanMap.set(s.kode_satuan, s.satuan_id);
      }
    }

    const unresolvedItems = items.filter((item) => {
      const barangId = item.barang_id ? Number(item.barang_id) : barangMap.get(item.itemCode);
      return !barangId;
    });

    if (unresolvedItems.length > 0) {
      throw new AppError(`Barang tidak ditemukan untuk: ${unresolvedItems.map((i) => i.itemCode).join(", ")}`, 400);
    }

    updateData.items = {
      deleteMany: {},
      create: items.map((item) => {
        const barangId = item.barang_id ? Number(item.barang_id) : (barangMap.get(item.itemCode) || null);
        const satuanId = item.satuan_id ? Number(item.satuan_id) : (satuanMap.get(item.unit) || null);

        return {
          barang_id: barangId,
          qty_rencana: item.quantity || item.qty_rencana || 0,
          satuan_id: satuanId,
          gudang_tujuan_id: item.destinationWarehouseId ? Number(item.destinationWarehouseId) : null,
        };
      }),
    };
  }

  return await prisma.boq.update({
    where: { boq_id: Number(id) },
    data: updateData,
    include: {
      tiket: {
        include: {
          project: true,
        },
      },
      items: {
        include: {
          barang: true,
          satuan: true,
          gudang_tujuan: true,
        },
      },
      diaktifkan_user: true,
    },
  });

  await prisma.audit_log.create({
    data: {
      entity_type: "boq",
      entity_id: BigInt(id),
      aksi: "update",
      actor_id: BigInt(userId),
      data_sebelum: {
        status: boq.status,
        catatan: boq.catatan,
        reference_file: boq.reference_file,
      },
      data_sesudah: {
        status: updateData.status || boq.status,
        updated_fields: Object.keys(updateData),
      },
    },
  });
};

const updateStatus = async (id, status, userId) => {
  const boq = await boqRepository.findById(id);

  if (!boq) {
    throw new AppError("BOQ tidak ditemukan.", 404);
  }

  const normalizedStatus = normalizeStatus(status);

  if (boq.status === "aktif" && normalizedStatus === "aktif") {
    throw new AppError("BOQ sudah aktif.", 400);
  }

  const result = await boqRepository.updateStatus(id, normalizedStatus, userId);

  await prisma.audit_log.create({
    data: {
      entity_type: "boq",
      entity_id: BigInt(id),
      aksi: "update_status",
      actor_id: BigInt(userId),
      data_sebelum: { status: boq.status },
      data_sesudah: { status: result.status, boq_id: id },
    },
  });

  return result;
};

const softDelete = async (id) => {
  const boq = await boqRepository.findById(id);

  if (!boq) {
    throw new AppError("BOQ tidak ditemukan.", 404);
  }

  if (boq.status === "aktif") {
    throw new AppError("BOQ yang sudah aktif tidak dapat dihapus.", 400);
  }

  return await boqRepository.softDelete(id);
};

const restore = async (id) => {
  return await boqRepository.restore(id);
};

const getSummary = async (id) => {
  return await boqRepository.getSummary(id);
};

const exportBoqs = async (query) => {
  return await boqRepository.exportBoqs(query);
};

const getStats = async () => {
  return await boqRepository.getStats();
};

const getAreas = async () => {
  return await boqRepository.getAreas();
};

const getItems = async (projectId) => {
  return await boqRepository.findItemsByProject(projectId);
};

module.exports = {
  create,
  findAll,
  findById,
  update,
  updateStatus,
  softDelete,
  restore,
  getSummary,
  exportBoqs,
  getStats,
  getAreas,
  getItems,
};
