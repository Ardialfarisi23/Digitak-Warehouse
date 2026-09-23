const suratJalanRepository = require("./surat-jalan.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const { PrismaClientKnownRequestError } = require("@prisma/client");
const notificationService = require("../notifications/notifications.service");
const capacityService = require("../capacity/capacity.service");

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

const collectShipmentGudangIds = (shipment) => {
  const ids = [shipment.gudang_asal_id, shipment.gudang_tujuan_id].filter(Boolean);
  return [...new Set(ids)];
};

const create = async (data, actorId) => {
  if (!data.tipe || !["inbound", "outbound"].includes(data.tipe)) {
    throw new AppError("Tipe surat jalan harus inbound atau outbound.", 400);
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new AppError("Minimal satu item harus diisi.", 400);
  }

  for (const item of data.items) {
    if (!item.barang_id || !item.satuan_id) {
      throw new AppError("Setiap item harus memiliki barang_id dan satuan_id.", 400);
    }
  }

  if (data.boq_id) {
    const boq = await prisma.boq.findUnique({
      where: { boq_id: Number(data.boq_id) },
      select: { boq_id: true, status: true, boq_number: true },
    });
    if (!boq || boq.status !== "aktif") {
      throw new AppError("Tidak dapat membuat surat jalan — BOQ/Project terkait belum diaktifkan oleh Admin.", 400);
    }
  }

  const MAX_ATTEMPTS = 5;
  let attempt = 0;

  while (attempt < MAX_ATTEMPTS) {
    attempt += 1;
    try {
      const suratJalan = await prisma.$transaction(async (tx) => {
        const created = await suratJalanRepository.create(data, actorId, tx);

        const aksi = data.tipe === "inbound" ? "create_inbound" : "create_outbound";

        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(created.surat_jalan_id),
            aksi: aksi,
            actor_id: BigInt(actorId),
            data_sebelum: null,
            data_sesudah: {
              status: created.status,
              surat_jalan_id: created.surat_jalan_id,
              tipe: created.tipe,
              nomor_surat_jalan: created.nomor_surat_jalan,
              ...(created.tipe === "inbound"
                ? { gudang_tujuan_id: created.gudang_tujuan_id }
                : {
                    gudang_asal_id: created.gudang_asal_id,
                    gudang_tujuan_id: created.gudang_tujuan_id,
                  }),
            },
          },
        });

        return created;
      });

      if (data.tipe === "outbound") {
        const actor = await prisma.user_account.findUnique({
          where: { user_id: BigInt(actorId) },
          select: { nama: true, role: true },
        });

        const gudangIds = collectShipmentGudangIds(suratJalan);

        if (actor?.role === "admin_general") {
          const supervisorIds = await getRelatedSupervisorIds();

          if (supervisorIds.length > 0) {
            await notificationService.create({
              userId: supervisorIds,
              type: "approval",
              title: "Outbound Menunggu Approval",
              message: `Pengajuan outbound ${suratJalan.nomor_surat_jalan} menunggu persetujuan.`,
              link: `/dashboard/supervisor/approval/outbound/${suratJalan.surat_jalan_id}`,
            });
          }
        } else if (actor?.role === "staf_gudang") {
          const supervisorIds = await getRelatedSupervisorIds();

          if (supervisorIds.length > 0) {
            await notificationService.create({
              userId: supervisorIds,
              type: "approval",
              title: "Outbound Menunggu Approval",
              message: `Pengajuan outbound ${suratJalan.nomor_surat_jalan} menunggu persetujuan.`,
              link: `/dashboard/supervisor/approval/outbound/${suratJalan.surat_jalan_id}`,
            });
          }
        }
      }

      return suratJalan;
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === "P2002" && attempt < MAX_ATTEMPTS) {
        const target = err.meta?.target;
        const isNomor =
          (Array.isArray(target) && target.includes("nomor_surat_jalan")) ||
          target === "nomor_surat_jalan";
        if (isNomor) {
          continue;
        }
      }
      if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
        throw new AppError("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.", 400);
      }
      throw err;
    }
  }

  throw new AppError("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.", 400);
};

const createStaffInbound = async (data, actorId) => {
  const payload = {
    ...data,
    tipe: "inbound",
    status: "menunggu_verifikasi",
  };

  const result = await create(payload, actorId);

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(actorId) },
    select: { nama: true, role: true },
  });

  const gudangIds = collectShipmentGudangIds(result);

  try {
    if (actor?.role === "admin_general" || actor?.role === "staf_gudang") {
      const supervisorIds = await getRelatedSupervisorIds();

      if (supervisorIds.length > 0) {
        await notificationService.create({
          userId: supervisorIds,
          type: "approval",
          title: "Inbound Menunggu Verifikasi",
          message: `Pengajuan inbound ${result?.nomor_surat_jalan || ""} menunggu verifikasi supervisor.`,
          link: "/dashboard/supervisor/approval/inbound",
        });
      }
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi create staff inbound:", notifErr);
  }

  return result;
};

const receiveInbound = async (id, items, actorId) => {
  const shipment = await suratJalanRepository.findById(id);

  if (!shipment) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (shipment.tipe !== "inbound") {
    throw new AppError("Surat Jalan ini bukan inbound.", 400);
  }

  if (shipment.status === "disetujui" || shipment.status === "diterima_didistribusikan") {
    throw new AppError("Inbound ini sudah diproses.", 400);
  }

  await prisma.$transaction(async (tx) => {
    // Mapping label UI → enum Prisma kondisi_barang
    const KONDISI_MAP = {
      "Baik": "baik",
      "Rusak Ringan": "rusak_ringan",
      "Rusak Berat": "rusak_berat",
      "Tidak Sesuai Spek": "tidak_sesuai_spek",
      "DOA": "doa",
      // Sudah lowercase (dari sumber lain)
      "baik": "baik",
      "rusak_ringan": "rusak_ringan",
      "rusak_berat": "rusak_berat",
      "tidak_sesuai_spek": "tidak_sesuai_spek",
      "doa": "doa",
    };

    for (const item of items) {
      const updateData = {};

      if (typeof item.qty === "number") {
        updateData.qty = item.qty;
      }
      if (typeof item.kondisi === "string") {
        // Konversi ke format enum Prisma (lowercase_underscore)
        const kondisiMapped = KONDISI_MAP[item.kondisi];
        if (kondisiMapped) {
          updateData.kondisi = kondisiMapped;
        }
      }
      if (typeof item.serial_number === "string") {
        updateData.serial_number = item.serial_number;
      }
      if (typeof item.catatan === "string") {
        updateData.catatan = item.catatan;
      }
      if (typeof item.zona_id === "number" && item.zona_id > 0) {
        updateData.zona_id = Number(item.zona_id);
      }

      if (Object.keys(updateData).length > 0) {
        await tx.surat_jalan_item.update({
          where: { item_id: Number(item.item_id) },
          data: updateData,
        });
      }
    }

    await suratJalanRepository.createApprovalLog(id, actorId, "inbound_putaway", "menunggu", "Penerimaan dicatat staf.", tx);
    await tx.audit_log.create({
      data: {
        entity_type: "surat_jalan",
        entity_id: BigInt(id),
        aksi: "receive_inbound",
        actor_id: BigInt(actorId),
        data_sebelum: { status: shipment.status },
        data_sesudah: { status: "draft_diajukan", items_updated: items.length, surat_jalan_id: id },
      },
    });
  });

  return await suratJalanRepository.findById(id);
};

const findOutboundQueue = async (filters = {}) => {
  return await suratJalanRepository.findOutboundQueue(filters);
};

const findStaffHistory = async (userId, query = {}) => {
  return await suratJalanRepository.findStaffHistory(userId, query);
};

const findRejectedList = async (query = {}) => {
  return await suratJalanRepository.findRejectedList(query);
};

const findInboundList = async (filters = {}) => {
  return await suratJalanRepository.findInboundList(filters);
};

const findVerificationQueue = async (query = {}) => {
  return await suratJalanRepository.findVerificationQueue(query);
};

const findOutboundForApproval = async (params = {}) => {
  return await suratJalanRepository.findOutboundForApproval(params);
};

const findOutboundForDelivery = async (params = {}) => {
  return await suratJalanRepository.findOutboundForDelivery(params);
};

const findById = async (id, actor) => {
  const record = await suratJalanRepository.findById(id);

  if (!record) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (!actor || ["admin_general", "supervisor"].includes(actor.role)) {
    return record;
  }

  if (actor.role === "staf_gudang") {
    const personil = await prisma.personil.findUnique({
      where: { user_id: BigInt(actor.id) },
      select: { gudang_id: true },
    });

    const gudangId = personil?.gudang_id ? Number(personil.gudang_id) : null;
    const actorId = Number(actor.id);

    const isCreator = Number(record.created_by) === actorId;
    const isAsal = record.gudang_asal_id !== null && Number(record.gudang_asal_id) === gudangId;
    const isTujuan = record.gudang_tujuan_id !== null && Number(record.gudang_tujuan_id) === gudangId;

    if (!isCreator && !isAsal && !isTujuan) {
      throw new AppError("Anda tidak memiliki akses ke surat jalan ini.", 403);
    }

    return record;
  }

  throw new AppError("Anda tidak memiliki akses ke surat jalan ini.", 403);
};

const approveInbound = async (id, itemAdjustments = [], actorId) => {
  const shipment = await suratJalanRepository.findById(id);

  if (!shipment) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (shipment.tipe !== "inbound") {
    throw new AppError("Surat Jalan ini bukan inbound.", 400);
  }

  if (shipment.status === "ready_putaway" || shipment.status === "disetujui" || shipment.status === "diterima_didistribusikan") {
    return shipment;
  }

  if (shipment.boq_id && shipment.boq?.status !== "aktif") {
    throw new AppError("Tidak dapat menyetujui inbound — BOQ/Project terkait belum diaktifkan oleh Admin.", 400);
  }

  if (Array.isArray(itemAdjustments) && itemAdjustments.length > 0) {
    await suratJalanRepository.updateInboundItems(itemAdjustments);
  }

  await prisma.$transaction(async (tx) => {
    await suratJalanRepository.addInboundStock(shipment, tx);
    await suratJalanRepository.updateStatus(id, "ready_putaway", tx);

    // NOTE: Auto-increment tiket.mos saat inbound DIHAPUS (2026-09-12).
    // tiket.mos sekarang murni representasi "MOS Mitra" — hanya diisi via laporan mitra (Excel/manual).
    // MOS Sistem (dari inbound) dihitung on-the-fly di reconciliation.repository.js, TIDAK disimpan di kolom ini.

    if (actorId) {
      await suratJalanRepository.createApprovalLog(id, actorId, "inbound_verifikasi", "disetujui", null, tx);
      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: "approve_inbound",
          actor_id: BigInt(actorId),
          data_sebelum: { status: shipment.status },
          data_sesudah: { status: "ready_putaway", surat_jalan_id: id },
        },
      });
    }
  });

  const updatedShipment = await suratJalanRepository.findById(id);

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(actorId) },
    select: { nama: true, role: true },
  });

  const gudangIds = collectShipmentGudangIds(updatedShipment);

  const sendNotification = async (users, link) => {
    if (!Array.isArray(users) || users.length === 0) return;
    try {
      await notificationService.create({
        userId: users,
        type: "success",
        title: "Inbound Disetujui",
        message: `Pengajuan inbound ${updatedShipment.nomor_surat_jalan} telah disetujui oleh ${actor?.nama || "Supervisor"}.`,
        link,
      });
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi approve inbound:", notifErr);
    }
  };

  if (actor?.role === "supervisor") {
    const creatorId = updatedShipment.created_by ? [Number(updatedShipment.created_by)] : [];
    await sendNotification(creatorId, `/staff/inbound/${updatedShipment.surat_jalan_id}`);
  }

  return await suratJalanRepository.findById(id);
};

const approveOutbound = async (id, actorId) => {
  const shipment = await suratJalanRepository.findById(id);

  if (!shipment) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (shipment.tipe !== "outbound") {
    throw new AppError("Surat Jalan ini bukan outbound.", 400);
  }

  if (shipment.status === "disetujui" || shipment.status === "diterima_didistribusikan") {
    return shipment;
  }

  if (shipment.boq_id && shipment.boq?.status !== "aktif") {
    throw new AppError("Tidak dapat menyetujui outbound — BOQ/Project terkait belum diaktifkan oleh Admin.", 400);
  }

  await prisma.$transaction(async (tx) => {
    await suratJalanRepository.reduceBoqAllocation(shipment, tx);
    await suratJalanRepository.updateStatus(id, "disetujui", tx);

    // NOTE: Auto-increment tiket_material.used saat outbound disetujui DIHAPUS (2026-09-12).
    // used sekarang murni merepresentasikan "Qty Terpasang" dari laporan mitra — hanya diisi via laporan mitra (Excel/manual).
    // Verifikasi SPV outbound tetap berfungsi sebagai tracking status surat jalan, TIDAK menulis ke kolom used.

    if (actorId) {
      await suratJalanRepository.createApprovalLog(id, actorId, "outbound_approval", "disetujui", null, tx);
      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: "approve_outbound",
          actor_id: BigInt(actorId),
          data_sebelum: { status: shipment.status },
          data_sesudah: { status: "disetujui", surat_jalan_id: id },
        },
      });
    }

    const actor = await prisma.user_account.findUnique({
      where: { user_id: BigInt(actorId) },
      select: { nama: true, role: true },
    });

    const gudangIds = collectShipmentGudangIds(shipment);

    const sendNotification = async (users, link) => {
      if (!Array.isArray(users) || users.length === 0) return;
      try {
        await notificationService.create({
          userId: users,
          type: "approval",
          title: "Surat Jalan Disetujui",
          message: `Surat Jalan ${shipment.nomor_surat_jalan} telah disetujui dan siap diproses.`,
          link,
        });
      } catch (notifErr) {
        console.error("Gagal membuat notifikasi approve outbound:", notifErr);
      }
    };

    if (actor?.role === "supervisor") {
      const creatorId = shipment.created_by ? [Number(shipment.created_by)] : [];
      await sendNotification(creatorId, `/staff/outbound/${shipment.surat_jalan_id}`);
    }
  });

  // Ambil data terbaru setelah transaksi berhasil untuk dikembalikan ke controller
  const updatedShipment = await suratJalanRepository.findById(id);
  return updatedShipment;
};

const confirmDistributed = async (id, actorId) => {
  const shipment = await suratJalanRepository.findById(id);

  if (!shipment) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (shipment.tipe !== "outbound") {
    throw new AppError("Hanya outbound yang dapat ditandai diterima/didistribusikan.", 400);
  }

  if (shipment.status === "diterima_didistribusikan") {
    return shipment;
  }

  if (shipment.status !== "disetujui") {
    throw new AppError("Surat Jalan outbound harus disetujui terlebih dahulu.", 400);
  }

  if (shipment.picking_selesai === false) {
    throw new AppError("Picking belum selesai. Selesaikan proses picking terlebih dahulu sebelum melakukan distribusi.", 400);
  }

  await prisma.$transaction(async (tx) => {
    await suratJalanRepository.updateStatus(id, "diterima_didistribusikan", tx);

    if (actorId) {
      await suratJalanRepository.createApprovalLog(id, actorId, "outbound_delivery", "disetujui", null, tx);
      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: "confirm_distributed",
          actor_id: BigInt(actorId),
          data_sebelum: { status: shipment.status },
          data_sesudah: { status: "diterima_didistribusikan", surat_jalan_id: id },
        },
      });
    }
  });

  const updatedShipment = await suratJalanRepository.findById(id);

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(actorId) },
    select: { nama: true, role: true },
  });

  const gudangIds = collectShipmentGudangIds(updatedShipment);

  const sendNotification = async (users, link) => {
    if (!Array.isArray(users) || users.length === 0) return;
    try {
      await notificationService.create({
        userId: users,
        type: "success",
        title: "Outbound Diterima",
        message: `Surat Jalan ${updatedShipment.nomor_surat_jalan} telah diterima/didistribusikan oleh ${actor?.nama || "Supervisor"}.`,
        link,
      });
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi confirm distributed:", notifErr);
    }
  };

  if (actor?.role === "supervisor") {
    const adminIds = await getAllAdminIds(Number(actorId));
    const supervisorIds = await getRelatedSupervisorIds(Number(actorId));
    const staffIds = await getRelatedStaffIds(gudangIds);

    await sendNotification(adminIds, `/dashboard`);
    await sendNotification(supervisorIds, `/dashboard/supervisor/approval/outbound/${updatedShipment.surat_jalan_id}`);
    await sendNotification(staffIds, `/staff/outbound/${updatedShipment.surat_jalan_id}`);
  }

  return updatedShipment;
};

const rejectInbound = async (id, catatan = null, actorId) => {
  const shipment = await suratJalanRepository.findById(id);

  if (!shipment) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (shipment.tipe !== "inbound") {
    throw new AppError("Surat Jalan ini bukan inbound.", 400);
  }

    await prisma.$transaction(async (tx) => {
      await suratJalanRepository.updateStatus(id, "ditolak", { catatan }, tx);

      if (actorId) {
        await suratJalanRepository.createApprovalLog(id, actorId, "inbound_verifikasi", "ditolak", catatan, tx);
        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(id),
            aksi: "reject_inbound",
            actor_id: BigInt(actorId),
            data_sebelum: { status: shipment.status },
            data_sesudah: { status: "ditolak", surat_jalan_id: id, catatan },
          },
        });
      }
    });

    const updatedShipment = await suratJalanRepository.findById(id);

    const actor = await prisma.user_account.findUnique({
      where: { user_id: BigInt(actorId) },
      select: { nama: true, role: true },
    });

    const gudangIds = collectShipmentGudangIds(updatedShipment);

    const sendNotification = async (users, link) => {
      if (!Array.isArray(users) || users.length === 0) return;
      try {
        await notificationService.create({
          userId: users,
          type: "warning",
          title: "Inbound Ditolak",
          message: `Pengajuan inbound ${updatedShipment.nomor_surat_jalan} telah ditolak oleh ${actor?.nama || "Supervisor"}.${catatan ? ` Catatan: ${catatan}` : ""}`,
          link,
        });
      } catch (notifErr) {
        console.error("Gagal membuat notifikasi reject inbound:", notifErr);
      }
    };

    if (actor?.role === "supervisor") {
      const creatorId = updatedShipment.created_by ? [Number(updatedShipment.created_by)] : [];
      await sendNotification(creatorId, `/staff/inbound/${updatedShipment.surat_jalan_id}`);
    }

    return updatedShipment;
  };

  const rejectOutbound = async (id, catatan = null, actorId) => {
  const shipment = await suratJalanRepository.findById(id);

  if (!shipment) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (shipment.tipe !== "outbound") {
    throw new AppError("Surat Jalan ini bukan outbound.", 400);
  }

    await prisma.$transaction(async (tx) => {
      await suratJalanRepository.updateStatus(id, "ditolak", { catatan }, tx);

      if (actorId) {
        await suratJalanRepository.createApprovalLog(id, actorId, "outbound_approval", "ditolak", catatan, tx);
        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(id),
            aksi: "reject_outbound",
            actor_id: BigInt(actorId),
            data_sebelum: { status: shipment.status },
            data_sesudah: { status: "ditolak", surat_jalan_id: id, catatan },
          },
        });
      }
    });

    const updatedShipment = await suratJalanRepository.findById(id);

    const actor = await prisma.user_account.findUnique({
      where: { user_id: BigInt(actorId) },
      select: { nama: true, role: true },
    });

    const gudangIds = collectShipmentGudangIds(updatedShipment);

    const sendNotification = async (users, link) => {
      if (!Array.isArray(users) || users.length === 0) return;
      try {
        await notificationService.create({
          userId: users,
          type: "warning",
          title: "Outbound Ditolak",
          message: `Pengajuan outbound ${updatedShipment.nomor_surat_jalan} telah ditolak oleh ${actor?.nama || "Supervisor"}.${catatan ? ` Catatan: ${catatan}` : ""}`,
          link,
        });
      } catch (notifErr) {
        console.error("Gagal membuat notifikasi reject outbound:", notifErr);
      }
    };

    if (actor?.role === "supervisor") {
      const creatorId = updatedShipment.created_by ? [Number(updatedShipment.created_by)] : [];
      await sendNotification(creatorId, `/staff/outbound/${updatedShipment.surat_jalan_id}`);
    }

    return updatedShipment;
  };

  const putaway = async (suratJalanId, items = [], actorId) => {
    const shipment = await suratJalanRepository.findById(suratJalanId);

    if (!shipment) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    if (shipment.tipe !== "inbound") {
      throw new AppError("Hanya inbound yang dapat diproses putaway.", 400);
    }

if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("Daftar item putaway kosong.", 400);
    }

    if (shipment.status === "diterima_didistribusikan") {
      throw new AppError(
        `Surat jalan ini sudah selesai diproses (status: ${shipment.status}), tidak bisa dilakukan putaway ulang.`,
        400
      );
    }

    const gudangTujuanId = Number(shipment.gudang_tujuan_id);

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const qty = Number(item.qty_ditempatkan || 0);
        const zonaId = item.zona_id ? Number(item.zona_id) : null;

        if (qty <= 0) continue;
        if (!zonaId) continue;

        const suratItem = shipment.items.find((si) => Number(si.item_id) === Number(item.item_id));
        if (!suratItem) continue;

        const barangId = Number(suratItem.barang_id);

        const genericStock = await tx.stok_gudang.findFirst({
          where: {
            gudang_id: gudangTujuanId,
            barang_id: barangId,
            kondisi: suratItem.kondisi || "baik",
            zona_id: null,
            project_id: shipment.project_id,
          },
          orderBy: { qty: "desc" },
        });

        if (!genericStock || Number(genericStock.qty || 0) < qty) {
          throw new AppError(
            `Stok generic untuk barang ${barangId} tidak mencukupi untuk putaway (Dibutuhkan: ${qty}, Tersedia: ${genericStock ? Number(genericStock.qty) : 0}).`,
            400
          );
        }

        const newGenericQty = Number(genericStock.qty || 0) - qty;

        if (newGenericQty <= 0) {
          await tx.stok_gudang.delete({
            where: { stok_id: genericStock.stok_id },
          });
        } else {
          await tx.stok_gudang.update({
            where: { stok_id: genericStock.stok_id },
            data: { qty: newGenericQty, updated_at: new Date() },
          });
        }

        await tx.stok_ledger.create({
          data: {
            surat_jalan_item_id: suratItem.item_id,
            barang_id: barangId,
            jenis_mutasi: "out",
            qty: qty,
            saldo_setelah: Math.max(0, newGenericQty),
          },
        });

        const zonaStock = await tx.stok_gudang.findFirst({
          where: {
            gudang_id: gudangTujuanId,
            barang_id: barangId,
            zona_id: zonaId,
            kondisi: suratItem.kondisi || "baik",
            project_id: shipment.project_id,
          },
        });

        let saldoSetelahZona = qty;
        if (zonaStock) {
          saldoSetelahZona = Number(zonaStock.qty || 0) + qty;
          await tx.stok_gudang.update({
            where: { stok_id: zonaStock.stok_id },
            data: { qty: saldoSetelahZona, updated_at: new Date() },
          });
        } else {
          const created = await tx.stok_gudang.create({
            data: {
              gudang_id: gudangTujuanId,
              barang_id: barangId,
              zona_id: zonaId,
              project_id: shipment.project_id,
              kondisi: suratItem.kondisi || "baik",
              qty: qty,
            },
          });
          saldoSetelahZona = Number(created.qty);
        }

        await tx.stok_ledger.create({
          data: {
            surat_jalan_item_id: suratItem.item_id,
            barang_id: barangId,
            jenis_mutasi: "in",
            qty: qty,
            saldo_setelah: saldoSetelahZona,
          },
        });

        await tx.surat_jalan_item.update({
          where: { item_id: suratItem.item_id },
          data: { zona_id: zonaId },
        });

        await capacityService.recalculateZonaStatus(tx, gudangTujuanId, zonaId);
      }

      await suratJalanRepository.updateStatus(suratJalanId, "diterima_didistribusikan", tx);

      if (actorId) {
        await suratJalanRepository.createApprovalLog(suratJalanId, actorId, "inbound_putaway", "disetujui", null, tx);
        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(suratJalanId),
            aksi: "putaway",
            actor_id: BigInt(actorId),
            data_sebelum: { status: shipment.status },
            data_sesudah: { status: "diterima_didistribusikan", surat_jalan_id: suratJalanId },
          },
        });
      }
    });

    const actor = await prisma.user_account.findUnique({
      where: { user_id: BigInt(actorId) },
      select: { nama: true, role: true },
    });

    const gudangIds = [gudangTujuanId];
    const targets = new Set();

    const adminIds = await getAllAdminIds(Number(actorId));
    adminIds.forEach((id) => targets.add(id));
    const supervisorIds = await getRelatedSupervisorIds(Number(actorId));
    supervisorIds.forEach((id) => targets.add(id));
    const staffIds = await getRelatedStaffIds(gudangIds);
    staffIds.forEach((id) => targets.add(id));

    try {
      if (targets.size > 0) {
        await notificationService.create({
          userId: Array.from(targets),
          type: "success",
          title: "Putaway Selesai",
          message: `Putaway untuk surat jalan ${shipment.nomor_surat_jalan} telah selesai diproses.`,
          link: `/staff/inbound/${suratJalanId}`,
        });
      }
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi putaway:", notifErr);
    }

    return await suratJalanRepository.findById(suratJalanId);
  };

  const retrieve = async (suratJalanId, items = [], actorId) => {
    const shipment = await suratJalanRepository.findById(suratJalanId);

    if (!shipment) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    if (shipment.tipe !== "outbound") {
      throw new AppError("Hanya outbound yang dapat diproses retrieval.", 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("Daftar item retrieval kosong.", 400);
    }

    const gudangAsalId = Number(shipment.gudang_asal_id);
    if (!shipment.gudang_asal_id || Number.isNaN(gudangAsalId) || gudangAsalId <= 0) {
      throw new AppError("Gudang asal tidak valid pada surat jalan ini. Silakan hubungi admin.", 400);
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const qty = Number(item.qty || 0);
        const zonaId = item.zona_id ? Number(item.zona_id) : null;

        if (qty <= 0) continue;
        if (!zonaId) continue;

        const suratItem = shipment.items.find((si) => Number(si.item_id) === Number(item.item_id));
        if (!suratItem) continue;

        const barangId = Number(suratItem.barang_id);

        const stock = await tx.stok_gudang.findFirst({
          where: {
            gudang_id: gudangAsalId,
            barang_id: barangId,
            zona_id: zonaId,
            kondisi: suratItem.kondisi || "baik",
            project_id: shipment.project_id,
          },
          orderBy: { qty: "desc" },
        });

        if (!stock) {
          throw new AppError(
            `Stok barang ${barangId} di zona tidak ditemukan.`,
            400
          );
        }

        const existingQty = Number(stock.qty || 0);
        if (existingQty < qty) {
          throw new AppError(
            `Stok barang ${barangId} di zona tidak mencukupi (Tersedia: ${existingQty}, Dibutuhkan: ${qty}).`,
            400
          );
        }

        const updatedQty = existingQty - qty;

        if (updatedQty <= 0) {
          await tx.stok_gudang.delete({
            where: { stok_id: stock.stok_id },
          });
        } else {
          await tx.stok_gudang.update({
            where: { stok_id: stock.stok_id },
            data: { qty: updatedQty, updated_at: new Date() },
          });
        }

        await tx.stok_ledger.create({
          data: {
            surat_jalan_item_id: suratItem.item_id,
            barang_id: barangId,
            jenis_mutasi: "out",
            qty: qty,
            saldo_setelah: Math.max(0, updatedQty),
          },
        });

        await capacityService.recalculateZonaStatus(tx, gudangAsalId, zonaId);
      }

      await suratJalanRepository.updateStatus(suratJalanId, "disetujui", { picking_selesai: true }, tx);

      if (actorId) {
        await suratJalanRepository.createApprovalLog(suratJalanId, actorId, "outbound_approval", "disetujui", null, tx);
        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(suratJalanId),
            aksi: "retrieve",
            actor_id: BigInt(actorId),
            data_sebelum: { status: shipment.status },
            data_sesudah: { status: "disetujui", surat_jalan_id: suratJalanId },
          },
        });
      }
    });

    try {
      const actor = await prisma.user_account.findUnique({
        where: { user_id: BigInt(actorId) },
        select: { nama: true, role: true },
      });

      const gudangIds = [gudangAsalId];

      const sendNotification = async (users, link) => {
        if (!Array.isArray(users) || users.length === 0) return;
        try {
          await notificationService.create({
            userId: users,
            type: "success",
            title: "Retrieval Selesai",
            message: `Retrieval untuk surat jalan ${shipment.nomor_surat_jalan} telah selesai diproses.`,
            link,
          });
        } catch (notifErr) {
          console.error("Gagal membuat notifikasi retrieval:", notifErr);
        }
      };

      const adminIds = await getAllAdminIds(Number(actorId));
      const supervisorIds = await getRelatedSupervisorIds(Number(actorId));
      const staffIds = await getRelatedStaffIds(gudangIds);

      await sendNotification(adminIds, `/dashboard`);
      await sendNotification(supervisorIds, `/dashboard/supervisor/approval/outbound/${suratJalanId}`);
      await sendNotification(staffIds, `/staff/outbound/${suratJalanId}`);
    } catch (notifErr) {
      console.error("Gagal memproses notifikasi retrieval:", notifErr);
    }

    return await suratJalanRepository.findById(suratJalanId);
  };

  const updateDeliveryStatus = async (id, body, actorId) => {
    const shipment = await suratJalanRepository.findById(id);

    if (!shipment) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    if (shipment.tipe !== "outbound") {
      throw new AppError("Hanya surat jalan outbound yang dapat diubah status distribusinya.", 400);
    }

    const allowedStatuses = ["disetujui", "sedang_dikirim"];
    if (!allowedStatuses.includes(shipment.status)) {
      throw new AppError(`Status surat jalan saat ini (${shipment.status}) tidak dapat diubah ke status distribusi.`, 400);
    }

    if (shipment.status === "disetujui" && shipment.picking_selesai === false) {
      throw new AppError("Picking belum selesai. Selesaikan proses picking terlebih dahulu sebelum melakukan distribusi.", 400);
    }

    if (!actorId) {
      throw new AppError("Actor tidak valid untuk melakukan perubahan status distribusi.", 400);
    }

    const newStatus = body.status;
    if (!["sedang_dikirim", "diterima_didistribusikan"].includes(newStatus)) {
      throw new AppError("Status distribusi tidak valid.", 400);
    }

    if (shipment.status === newStatus) {
      return shipment;
    }

    const updateData = {
      status: newStatus,
    };

    if (body.estimasi_tiba) {
      updateData.estimasi_tiba = new Date(body.estimasi_tiba);
    }

    if (body.catatan_distribusi !== undefined) {
      updateData.catatan_distribusi = body.catatan_distribusi || null;
    }

    await prisma.$transaction(async (tx) => {
      await suratJalanRepository.updateDeliveryStatus(id, updateData, tx);
      await suratJalanRepository.createApprovalLog(id, actorId, "outbound_delivery", "disetujui", body.catatan_distribusi || null, tx);
      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: newStatus === "sedang_dikirim" ? "start_delivery" : "confirm_distributed",
          actor_id: BigInt(actorId),
          data_sebelum: { status: shipment.status },
          data_sesudah: { status: newStatus, surat_jalan_id: id },
        },
      });
    });

    if (newStatus === "sedang_dikirim") {
      const actor = await prisma.user_account.findUnique({
        where: { user_id: BigInt(actorId) },
        select: { nama: true, role: true },
      });

      const gudangIds = [shipment.gudang_asal_id, shipment.gudang_tujuan_id].filter(Boolean);

      const sendNotification = async (users, link) => {
        if (!Array.isArray(users) || users.length === 0) return;
        try {
          await notificationService.create({
            userId: users,
            type: "info",
            title: "Outbound Dalam Pengiriman",
            message: `Surat jalan ${shipment.nomor_surat_jalan} sedang dalam pengiriman.`,
            link,
          });
        } catch (notifErr) {
          console.error("Gagal membuat notifikasi delivery status:", notifErr);
        }
      };

      const adminIds = await getAllAdminIds(Number(actorId));
      const supervisorIds = await getRelatedSupervisorIds(Number(actorId));
      const staffIds = await getRelatedStaffIds(gudangIds);

      try {
        await sendNotification(adminIds, `/dashboard`);
        await sendNotification(supervisorIds, `/dashboard/supervisor/approval/outbound/${id}`);
        await sendNotification(staffIds, `/staff/outbound/${id}`);
      } catch (notifErr) {
        console.error("Gagal memproses notifikasi delivery status:", notifErr);
      }
    }

    return await suratJalanRepository.findById(id);
  };

  const addItemFoto = async (suratJalanId, itemId, body, actorId) => {
    const suratJalan = await suratJalanRepository.findById(suratJalanId);

    if (!suratJalan) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    const item = suratJalan.items.find((i) => Number(i.item_id) === Number(itemId));

    if (!item) {
      throw new AppError("Item surat jalan tidak ditemukan.", 404);
    }

    const { url, filename, mimetype, ukuran_bytes } = body;

    if (!url) {
      throw new AppError("URL foto wajib diisi.", 400);
    }

    const foto = await suratJalanRepository.addItemFoto(itemId, {
      url,
      filename,
      mimetype,
      ukuran_bytes: ukuran_bytes ? Number(ukuran_bytes) : null,
    });

    await suratJalanRepository.updateItemVerification(itemId, {
      diperiksa_oleh: actorId,
      diperiksa_pada: new Date(),
    });

    return foto;
  };

  const deleteItemFoto = async (suratJalanId, itemId, fotoId) => {
    const suratJalan = await suratJalanRepository.findById(suratJalanId);

    if (!suratJalan) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    const item = suratJalan.items.find((i) => Number(i.item_id) === Number(itemId));

    if (!item) {
      throw new AppError("Item surat jalan tidak ditemukan.", 404);
    }

    const foto = item.fotos?.find((f) => Number(f.foto_id) === Number(fotoId));

    if (!foto) {
      throw new AppError("Foto tidak ditemukan untuk item ini.", 404);
    }

    await suratJalanRepository.deleteItemFoto(fotoId);

    return { deleted: true };
  };

  module.exports = {
    create,
    createStaffInbound,
    receiveInbound,
    findOutboundQueue,
    findInboundList,
    findById,
    findVerificationQueue,
    findOutboundForApproval,
    findOutboundForDelivery,
    approveInbound,
    approveOutbound,
    confirmDistributed,
    rejectInbound,
    rejectOutbound,
    putaway,
    retrieve,
    updateDeliveryStatus,
    addItemFoto,
    deleteItemFoto,
findStaffHistory,
  findRejectedList,
};