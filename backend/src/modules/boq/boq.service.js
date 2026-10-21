const boqRepository = require("./boq.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const notificationService = require("../../modules/notifications/notifications.service");
const { normalizeClusterId } = require("../../utils/clusterResolver");

const normalizeStatus = (status) => {
  if (!status) return status;
  const map = {
    DRAFT: "draft",
    AKTIF: "aktif",
    SELESAI: "selesai",
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

const { getJakartaYear, formatBoqNumber, parseBoqSequence, withBoqNumberRetry } = require("./boq-number.util");

const generateBoqNumber = async () => {
  const now = new Date();
  const year = getJakartaYear(now);
  const lastBoq = await prisma.boq.findFirst({
    where: {
      boq_number: {
        startsWith: `BOQ-${year}`,
      },
    },
    orderBy: { boq_id: 'desc' },
    select: { boq_number: true },
  });

  let nextNumber = 1;
  const lastSeq = parseBoqSequence(lastBoq?.boq_number);
  if (lastSeq !== null) {
    nextNumber = lastSeq + 1;
  }

  return formatBoqNumber(now, nextNumber);
};

const getBoqIdentifier = (boq) => boq.boq_number || `BOQ-${boq.boq_id}`;

const getBoqProjectName = (boq) => boq?.tiket?.project?.nama_project || null;

const assertTicketNumberUnique = async (ticketNumber, excludeBoqId = null) => {
  const existingTiket = await prisma.tiket_material.findFirst({
    where: { kode_tiket: ticketNumber },
    include: { boq: true },
  });

  if (!existingTiket) return;

  if (existingTiket.boq) {
    const usedByBoqId = existingTiket.boq.boq_id;
    if (excludeBoqId === null || Number(usedByBoqId) !== Number(excludeBoqId)) {
      const boqIdentifier = getBoqIdentifier(existingTiket.boq);
      throw new AppError(
        `Nomor tiket "${ticketNumber}" sudah digunakan pada BOQ ${boqIdentifier}.`,
        409
      );
    }
  }
};

const getRelatedUserIdsByGudang = async (gudangIds, roles) => {
  if (!Array.isArray(gudangIds) || gudangIds.length === 0 || !Array.isArray(roles) || roles.length === 0) {
    return [];
  }
  const numericGudangIds = gudangIds.map(Number).filter((id) => !Number.isNaN(id));
  if (numericGudangIds.length === 0) return [];

  const personnel = await prisma.personil.findMany({
    where: {
      gudang_id: { in: numericGudangIds },
      user: {
        role: { in: roles },
        is_aktif: true,
      },
    },
    select: { user_id: true },
  });

  return personnel.map((p) => Number(p.user_id)).filter((id) => !Number.isNaN(id) && id > 0);
};

const getRelatedSupervisorIds = async (excludeUserId = null) => {
  const supervisors = await prisma.user_account.findMany({
    where: { role: "supervisor", is_aktif: true },
    select: { user_id: true },
  });
  let ids = supervisors.map((s) => s.user_id).filter((id) => id != null);
  if (excludeUserId != null) {
    const numericExclude = Number(excludeUserId);
    return ids.filter((id) => id !== numericExclude);
  }
  return ids;
};

const getRelatedStaffIds = async (gudangIds) => {
  return await getRelatedUserIdsByGudang(gudangIds, ["staf_gudang"]);
};

const getAllAdminIds = async (excludeUserId = null) => {
  const admins = await prisma.user_account.findMany({
    where: { role: "admin_general", is_aktif: true },
    select: { user_id: true },
  });
  let ids = admins.map((a) => Number(a.user_id)).filter((id) => !Number.isNaN(id) && id > 0);
  if (excludeUserId != null) {
    const numericExclude = Number(excludeUserId);
    ids = ids.filter((id) => id !== numericExclude);
  }
  return ids;
};

const getAllSupervisorIds = async (excludeUserId = null) => {
  const supervisors = await prisma.user_account.findMany({
    where: { role: "supervisor", is_aktif: true },
    select: { user_id: true },
  });
  let ids = supervisors.map((s) => Number(s.user_id)).filter((id) => !Number.isNaN(id) && id > 0);
  if (excludeUserId != null) {
    const numericExclude = Number(excludeUserId);
    ids = ids.filter((id) => id !== numericExclude);
  }
  return ids;
};

const getAllStaffIds = async (excludeUserId = null) => {
  const staff = await prisma.user_account.findMany({
    where: { role: "staf_gudang", is_aktif: true },
    select: { user_id: true },
  });
  let ids = staff.map((s) => Number(s.user_id)).filter((id) => !Number.isNaN(id) && id > 0);
  if (excludeUserId != null) {
    const numericExclude = Number(excludeUserId);
    ids = ids.filter((id) => id !== numericExclude);
  }
  return ids;
};

const collectBoqGudangIds = (boq) => {
  const ids = (boq?.items || []).map((item) => Number(item.gudang_tujuan_id)).filter((id) => !Number.isNaN(id) && id > 0);
  return [...new Set(ids)];
};

const create = async (data, userId) => {
  const { items, projectId, area, ticketNumber, notes, referenceFile, emailReference, clusterId, ...boqData } = data;

  if (!ticketNumber) {
    throw new AppError("Kode tiket wajib diisi.", 400);
  }

  if (!clusterId) {
    throw new AppError("Cluster ID wajib dipilih.", 400);
  }

  const cluster = await prisma.cluster.findUnique({
    where: { cluster_id: normalizeClusterId(clusterId) },
  });

  if (!cluster) {
    throw new AppError("Cluster tidak ditemukan.", 404);
  }

  const existingActiveBoqForCluster = await prisma.boq.findFirst({
    where: {
      cluster_id: normalizeClusterId(clusterId),
      status: "aktif",
    },
  });

  if (existingActiveBoqForCluster) {
    throw new AppError("Cluster ini sudah memiliki BOQ aktif.", 400);
  }

  await assertTicketNumberUnique(ticketNumber);

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
        cluster_id: normalizeClusterId(clusterId),
        created_by: userId,
      },
    });
  }

const boqDataWithMeta = {
    ...boqData,
    tiket_id: tiket.tiket_id,
    cluster_id: normalizeClusterId(clusterId),
    created_by: userId,
    updated_by: userId,
    status: normalizeStatus(boqData.status),
    source: normalizeSource(boqData.source),
    external_verification_status: normalizeVerification(boqData.external_verification_status),
    catatan: notes || boqData.notes || null,
    reference_file: referenceFile || null,
    email_reference: emailReference || null,
  };

  delete boqDataWithMeta.externalVerificationStatus;
  delete boqDataWithMeta.notes;
  delete boqDataWithMeta.referenceFile;
  delete boqDataWithMeta.emailReference;

  if (items && items.length > 0) {
    const barangMap = new Map();
    if (items.some((item) => item.itemCode && !item.barang_id)) {
      const barangs = await prisma.barang.findMany({
        where: {
          is_aktif: true,
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
        satuanMap.set(s.satuan, s.satuan_id);
      }
    }

    const unresolvedItems = items.filter((item) => {
      const barangId = item.barang_id ? Number(item.barang_id) : barangMap.get(item.itemCode);
      return !barangId;
    });

    if (unresolvedItems.length > 0) {
      const kodes = unresolvedItems.map((i) => i.itemCode).join(", ");
      throw new AppError(
        `Item dengan kode "${kodes}" belum terdaftar di master barang. ` +
        `Hubungi Admin untuk menambahkan item terlebih dahulu, atau pilih kode barang yang sudah ada.`,
        400
      );
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
          cluster_id: normalizeClusterId(boqDataWithMeta.cluster_id),
        };
      }),
    };
  }

  const result = await withBoqNumberRetry(
    () => generateBoqNumber(),
    (boqNumber) => boqRepository.create({ ...boqDataWithMeta, boq_number: boqNumber })
  );

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(userId) },
    select: { nama: true, email: true, role: true },
  });

  const gudangIds = collectBoqGudangIds(result);

  try {
    if (actor?.role === "admin_general") {
      const supervisorIds = await getAllSupervisorIds(Number(userId));
      const staffIds = await getAllStaffIds(Number(userId));

      if (supervisorIds.length > 0) {
        await notificationService.create({
          userId: supervisorIds,
          type: "info",
          title: "BOQ Baru Dibuat",
          message: `${getBoqIdentifier(result)}${getBoqProjectName(result) ? ` untuk project ${getBoqProjectName(result)}` : ""} telah dibuat oleh ${actor?.nama || "Admin"}.`,
          link: `/dashboard/boq?id=${result.boq_id}`,
        });
      }
      if (staffIds.length > 0) {
        await notificationService.create({
          userId: staffIds,
          type: "info",
          title: "BOQ Baru Dibuat",
          message: `${getBoqIdentifier(result)}${getBoqProjectName(result) ? ` untuk project ${getBoqProjectName(result)}` : ""} telah dibuat oleh ${actor?.nama || "Admin"}.`,
          link: `/dashboard/boq?id=${result.boq_id}`,
        });
      }
    } else if (actor?.role === "supervisor") {
      const adminIds = await getAllAdminIds(Number(userId));
      const supervisorIds = await getAllSupervisorIds(Number(userId));
      const staffIds = await getAllStaffIds(Number(userId));

      if (adminIds.length > 0) {
        await notificationService.create({
          userId: adminIds,
          type: "info",
          title: "BOQ Baru Dibuat",
          message: `${getBoqIdentifier(result)}${getBoqProjectName(result) ? ` untuk project ${getBoqProjectName(result)}` : ""} telah dibuat oleh ${actor?.nama || "Supervisor"}.`,
          link: `/dashboard/boq?id=${result.boq_id}`,
        });
      }
      if (supervisorIds.length > 0) {
        await notificationService.create({
          userId: supervisorIds,
          type: "info",
          title: "BOQ Baru Dibuat",
          message: `${getBoqIdentifier(result)}${getBoqProjectName(result) ? ` untuk project ${getBoqProjectName(result)}` : ""} telah dibuat oleh ${actor?.nama || "Supervisor"}.`,
          link: `/dashboard/boq?id=${result.boq_id}`,
        });
      }
      if (staffIds.length > 0) {
        await notificationService.create({
          userId: staffIds,
          type: "info",
          title: "BOQ Baru Dibuat",
          message: `${getBoqIdentifier(result)}${getBoqProjectName(result) ? ` untuk project ${getBoqProjectName(result)}` : ""} telah dibuat oleh ${actor?.nama || "Supervisor"}.`,
          link: `/dashboard/boq?id=${result.boq_id}`,
        });
      }
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi create BOQ:", notifErr);
  }

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

  if (boq.status === "aktif" || boq.status === "selesai") {
    throw new AppError("BOQ yang sudah aktif atau selesai tidak dapat diubah.", 400);
  }

  const { items, projectId, area, ticketNumber, notes, referenceFile, emailReference, clusterId, ...boqData } = data;

  const updateData = {
    ...boqData,
    updated_by: userId,
    status: boqData.status ? normalizeStatus(boqData.status) : undefined,
    source: boqData.source ? normalizeSource(boqData.source) : undefined,
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

  if (emailReference !== undefined) {
    updateData.email_reference = emailReference || null;
    delete updateData.emailReference;
  }

  if (clusterId !== undefined) {
    const newClusterId = String(clusterId);
    if (newClusterId !== (boq.cluster_id || "")) {
      const cluster = await prisma.cluster.findUnique({
        where: { cluster_id: newClusterId },
      });

      if (!cluster) {
        throw new AppError("Cluster tidak ditemukan.", 404);
      }

      const existingActiveBoqForCluster = await prisma.boq.findFirst({
        where: {
          cluster_id: newClusterId,
          status: "aktif",
          boq_id: Number(id),
        },
      });

      if (existingActiveBoqForCluster) {
        throw new AppError("Cluster ini sudah memiliki BOQ aktif.", 400);
      }

      updateData.cluster_id = newClusterId;
    }
  }

  if (projectId || area || ticketNumber) {
    const tiketUpdateData = {};
    if (projectId) tiketUpdateData.project_id = Number(projectId);
    if (area) tiketUpdateData.area = area;
    if (ticketNumber) {
      await assertTicketNumberUnique(ticketNumber, Number(id));
      tiketUpdateData.kode_tiket = ticketNumber;
    }

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
          is_aktif: true,
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
      const kodes = unresolvedItems.map((i) => i.itemCode).join(", ");
      throw new AppError(
        `Item dengan kode "${kodes}" belum terdaftar di master barang. ` +
        `Hubungi Admin untuk menambahkan item terlebih dahulu, atau pilih kode barang yang sudah ada.`,
        400
      );
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

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(userId) },
    select: { nama: true, email: true, role: true },
  });

  const gudangIds = collectBoqGudangIds(boq);
  const targets = new Set();

  if (boq.created_by && Number(boq.created_by) !== Number(userId)) {
    targets.add(Number(boq.created_by));
  }

  if (actor?.role === "admin_general") {
    const supervisorIds = await getRelatedSupervisorIds();
    supervisorIds.forEach((id) => targets.add(id));
    const staffIds = await getRelatedStaffIds(gudangIds);
    staffIds.forEach((id) => targets.add(id));
  } else if (actor?.role === "supervisor") {
    const adminIds = await getAllAdminIds(Number(userId));
    adminIds.forEach((id) => targets.add(id));
    const supervisorIds = await getRelatedSupervisorIds(Number(userId));
    supervisorIds.forEach((id) => targets.add(id));
    const staffIds = await getRelatedStaffIds(gudangIds);
    staffIds.forEach((id) => targets.add(id));
  }

  try {
    if (targets.size > 0) {
      await notificationService.create({
        userId: Array.from(targets),
        type: "info",
        title: "BOQ Diperbarui",
        message: `${getBoqIdentifier(boq)}${getBoqProjectName(boq) ? ` untuk project ${getBoqProjectName(boq)}` : ""} telah diperbarui oleh ${actor?.nama || "Admin/Supervisor"}.`,
        link: `/dashboard/boq?id=${boq.boq_id}`,
      });
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi update BOQ:", notifErr);
  }

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

  if (boq.status === normalizedStatus) {
    throw new AppError(`BOQ sudah berstatus ${boq.status}.`, 400);
  }

  const result = await boqRepository.updateStatus(id, normalizedStatus, userId);

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(userId) },
    select: { nama: true, email: true, role: true },
  });

  const statusLabel =
    normalizedStatus === "aktif"
      ? "disetujui"
      : normalizedStatus === "ditolak"
        ? "ditolak"
        : `diubah menjadi ${normalizedStatus}`;

  const gudangIds = collectBoqGudangIds(boq);
  const targets = new Set();

  if (boq.created_by && Number(boq.created_by) !== Number(userId)) {
    targets.add(Number(boq.created_by));
  }

  if (actor?.role === "admin_general") {
    try {
      await notificationService.create({
        role: "supervisor",
        type: normalizedStatus === "ditolak" ? "warning" : "success",
        title: `BOQ ${statusLabel}`,
        message: `${getBoqIdentifier(boq)}${getBoqProjectName(boq) ? ` untuk project ${getBoqProjectName(boq)}` : ""} telah ${statusLabel} oleh ${actor?.nama || "Admin"}.`,
        link: `/dashboard/boq?id=${boq.boq_id}`,
      });

      await notificationService.create({
        role: "staf_gudang",
        type: normalizedStatus === "ditolak" ? "warning" : "success",
        title: `BOQ ${statusLabel}`,
        message: `${getBoqIdentifier(boq)}${getBoqProjectName(boq) ? ` untuk project ${getBoqProjectName(boq)}` : ""} telah ${statusLabel} oleh ${actor?.nama || "Admin"}.`,
        link: `/dashboard/boq?id=${boq.boq_id}`,
      });
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi update status BOQ:", notifErr);
    }
  } else if (actor?.role === "supervisor") {
    const adminIds = await getAllAdminIds(Number(userId));
    adminIds.forEach((id) => targets.add(id));

    if (normalizedStatus === "aktif") {
      const supervisorIds = await getAllSupervisorIds(Number(userId));
      supervisorIds.forEach((id) => targets.add(id));
      const staffIds = await getAllStaffIds(Number(userId));
      staffIds.forEach((id) => targets.add(id));
    } else {
      const supervisorIds = await getRelatedSupervisorIds(gudangIds, Number(userId));
      supervisorIds.forEach((id) => targets.add(id));
      const staffIds = await getRelatedStaffIds(gudangIds);
      staffIds.forEach((id) => targets.add(id));
    }

    try {
      if (targets.size > 0) {
        await notificationService.create({
          userId: Array.from(targets),
          type: normalizedStatus === "ditolak" ? "warning" : "success",
          title: `BOQ ${statusLabel}`,
          message: `${getBoqIdentifier(boq)}${getBoqProjectName(boq) ? ` untuk project ${getBoqProjectName(boq)}` : ""} telah ${statusLabel} oleh ${actor?.nama || "Supervisor"}.`,
          link: `/dashboard/boq?id=${boq.boq_id}`,
        });
      }
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi update status BOQ:", notifErr);
    }
  }

  try {
    await prisma.audit_log.create({
      data: {
        entity_type: "boq",
        entity_id: BigInt(Number(id)),
        aksi: "update",
        actor_id: BigInt(Number(userId)),
        data_sebelum: { status: boq.status },
        data_sesudah: {
          status: result.status,
          boq_id: Number(id),
          ...(normalizedStatus === "aktif"
            ? {
                keterangan: "Aktivasi BOQ",
                boq_number: boq.boq_number || null,
                nama_cluster: boq.cluster?.nama_cluster || null,
              }
            : {}),
        },
      },
    });
  } catch (auditErr) {
    console.error("Gagal mencatat audit log aktivasi BOQ:", auditErr);
  }

  return result;
};

const softDelete = async (id, userId) => {
  const boq = await boqRepository.findById(id);

  if (!boq) {
    throw new AppError("BOQ tidak ditemukan.", 404);
  }

  if (boq.status === "aktif" || boq.status === "selesai") {
    throw new AppError("BOQ yang sudah aktif atau selesai tidak dapat dihapus.", 400);
  }

  const result = await boqRepository.softDelete(id);

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(userId) },
    select: { nama: true, email: true, role: true },
  });

  const gudangIds = collectBoqGudangIds(boq);
  const targets = new Set();

  if (boq.created_by && Number(boq.created_by) !== Number(userId)) {
    targets.add(Number(boq.created_by));
  }

  if (actor?.role === "admin_general") {
    const supervisorIds = await getRelatedSupervisorIds();
    supervisorIds.forEach((id) => targets.add(id));
    const staffIds = await getRelatedStaffIds(gudangIds);
    staffIds.forEach((id) => targets.add(id));
  } else if (actor?.role === "supervisor") {
    const adminIds = await getAllAdminIds(Number(userId));
    adminIds.forEach((id) => targets.add(id));
    const supervisorIds = await getRelatedSupervisorIds(Number(userId));
    supervisorIds.forEach((id) => targets.add(id));
    const staffIds = await getRelatedStaffIds(gudangIds);
    staffIds.forEach((id) => targets.add(id));
  }

  try {
    if (targets.size > 0) {
      await notificationService.create({
        userId: Array.from(targets),
        type: "warning",
        title: "BOQ Diarsipkan",
        message: `${getBoqIdentifier(boq)}${getBoqProjectName(boq) ? ` untuk project ${getBoqProjectName(boq)}` : ""} telah diarsipkan oleh ${actor?.nama || "Admin/Supervisor"}.`,
        link: `/dashboard/boq?id=${boq.boq_id}`,
      });
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi soft delete BOQ:", notifErr);
  }

  return result;
};

const restore = async (id, userId) => {
  const boq = await boqRepository.findById(id);

  if (!boq) {
    throw new AppError("BOQ tidak ditemukan.", 404);
  }

  const result = await boqRepository.restore(id);

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(userId) },
    select: { nama: true, email: true, role: true },
  });

  const gudangIds = collectBoqGudangIds(boq);
  const targets = new Set();

  if (boq.created_by && Number(boq.created_by) !== Number(userId)) {
    targets.add(Number(boq.created_by));
  }

  if (actor?.role === "admin_general") {
    const supervisorIds = await getRelatedSupervisorIds();
    supervisorIds.forEach((id) => targets.add(id));
    const staffIds = await getRelatedStaffIds(gudangIds);
    staffIds.forEach((id) => targets.add(id));
  } else if (actor?.role === "supervisor") {
    const adminIds = await getAllAdminIds(Number(userId));
    adminIds.forEach((id) => targets.add(id));
    const supervisorIds = await getRelatedSupervisorIds(Number(userId));
    supervisorIds.forEach((id) => targets.add(id));
    const staffIds = await getRelatedStaffIds(gudangIds);
    staffIds.forEach((id) => targets.add(id));
  }

  try {
    if (targets.size > 0) {
      await notificationService.create({
        userId: Array.from(targets),
        type: "success",
        title: "BOQ Dipulihkan",
        message: `${getBoqIdentifier(boq)}${getBoqProjectName(boq) ? ` untuk project ${getBoqProjectName(boq)}` : ""} telah dipulihkan oleh ${actor?.nama || "Admin/Supervisor"}.`,
        link: `/dashboard/boq?id=${boq.boq_id}`,
      });
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi restore BOQ:", notifErr);
  }

  return result;
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

const getExportMatrixData = async () => {
  return await boqRepository.getExportMatrixData();
};

/**
 * Daftar BOQ read-only (dropdown/picker) — data minimal, tanpa metadata
 * manajemen. Dipakai staf pada form Surat Jalan.
 */
const findOptions = async (query = {}) => {
  const clusterIds = query.clusterIds
    ? String(query.clusterIds)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : query.clusterId
      ? [String(query.clusterId)]
      : undefined;

  return await boqRepository.findOptions({
    search: query.search,
    status: query.status,
    excludeStatus: query.excludeStatus,
    projectId: query.projectId,
    clusterIds,
    limit: query.limit,
  });
};

/**
 * Detail BOQ read-only (form Surat Jalan staf) — hanya id/nomor/tiket/cluster
 * dan daftar item (barang + qty rencana).
 */
const findOptionDetail = async (id) => {
  const boq = await boqRepository.findOptionDetail(id);
  if (!boq) {
    throw new AppError("BOQ tidak ditemukan.", 404);
  }
  return boq;
};

const getItems = async (projectId, statuses, clusterId = null, searchKeywords = []) => {
  return await boqRepository.findItemsByProject(projectId, clusterId, statuses, searchKeywords);
};

const checkTicketAvailability = async (ticketNumber, excludeBoqId = null) => {
  const existingTiket = await prisma.tiket_material.findFirst({
    where: { kode_tiket: ticketNumber },
    include: { boq: true },
  });

  if (!existingTiket) {
    return { available: true };
  }

  if (existingTiket.boq) {
    const usedByBoqId = existingTiket.boq.boq_id;
    if (excludeBoqId === null || Number(usedByBoqId) !== Number(excludeBoqId)) {
      const boqIdentifier = getBoqIdentifier(existingTiket.boq);
      return {
        available: false,
        message: `Nomor tiket "${ticketNumber}" sudah digunakan pada BOQ ${boqIdentifier}.`,
      };
    }
  }

  return { available: true };
};

module.exports = {
  create,
  findAll,
  findById,
  findOptions,
  findOptionDetail,
  update,
  updateStatus,
  softDelete,
  restore,
  getSummary,
  exportBoqs,
  getStats,
  getAreas,
  getItems,
  getExportMatrixData,
  checkTicketAvailability,
};
