const suratJalanRepository = require("./surat-jalan.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");

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

  return await suratJalanRepository.create(data, actorId);
};

const createStaffInbound = async (data, actorId) => {
  const payload = {
    ...data,
    tipe: "inbound",
    status: "menunggu_verifikasi",
  };

  return await create(payload, actorId);
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
    for (const item of items) {
      const updateData = {};

      if (typeof item.qty === "number") {
        updateData.qty = item.qty;
      }
      if (typeof item.kondisi === "string") {
        updateData.kondisi = item.kondisi;
      }
      if (typeof item.serial_number === "string") {
        updateData.serial_number = item.serial_number;
      }
      if (typeof item.catatan === "string") {
        updateData.catatan = item.catatan;
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

const findOutboundQueue = async () => {
  return await suratJalanRepository.findOutboundQueue();
};

const findInboundList = async () => {
  return await suratJalanRepository.findInboundList();
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

const findById = async (id) => {
  const record = await suratJalanRepository.findById(id);

  if (!record) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  return record;
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

  if (Array.isArray(itemAdjustments) && itemAdjustments.length > 0) {
    await suratJalanRepository.updateInboundItems(itemAdjustments);
  }

  await prisma.$transaction(async (tx) => {
    await suratJalanRepository.addInboundStock(shipment, tx);
    await suratJalanRepository.updateStatus(id, "disetujui", tx);

    if (shipment.boq_id && shipment.boq?.tiket_id) {
      const totalQty = shipment.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      if (totalQty > 0) {
        const tiket = await tx.tiket_material.findUnique({
          where: { tiket_id: Number(shipment.boq.tiket_id) },
        });
        if (tiket) {
          const currentMos = Number(tiket.mos || 0);
          await tx.tiket_material.update({
            where: { tiket_id: Number(shipment.boq.tiket_id) },
            data: { mos: currentMos + totalQty },
          });
        }
      }
    }

    if (actorId) {
      await suratJalanRepository.createApprovalLog(id, actorId, "inbound_verifikasi", "disetujui", null, tx);
      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: "approve_inbound",
          actor_id: BigInt(actorId),
          data_sebelum: { status: shipment.status },
          data_sesudah: { status: "disetujui", surat_jalan_id: id },
        },
      });
    }
  });

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

  await prisma.$transaction(async (tx) => {
    await suratJalanRepository.deductOutboundStock(shipment, tx);
    await suratJalanRepository.reduceBoqAllocation(shipment, tx);
    await suratJalanRepository.updateStatus(id, "disetujui", tx);

    if (shipment.boq_id && shipment.boq?.tiket_id) {
      const totalQty = shipment.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      if (totalQty > 0) {
        const tiket = await tx.tiket_material.findUnique({
          where: { tiket_id: Number(shipment.boq.tiket_id) },
        });
        if (tiket) {
          const currentUsed = Number(tiket.used || 0);
          await tx.tiket_material.update({
            where: { tiket_id: Number(shipment.boq.tiket_id) },
            data: { used: currentUsed + totalQty },
          });
        }
      }
    }

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
  });

  return await suratJalanRepository.findById(id);
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

  return await suratJalanRepository.findById(id);
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
      await suratJalanRepository.updateStatus(id, "ditolak", tx);

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

    return await suratJalanRepository.findById(id);
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
      await suratJalanRepository.updateStatus(id, "ditolak", tx);

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

    return await suratJalanRepository.findById(id);
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

    await prisma.$transaction(async (tx) => {
      const gudangTujuanId = Number(shipment.gudang_tujuan_id);

      for (const item of items) {
        const qty = Number(item.qty || 0);
        const binLokasiId = item.bin_lokasi_id ? Number(item.bin_lokasi_id) : null;

        if (qty <= 0) continue;
        if (!binLokasiId) continue;

        const suratItem = shipment.items.find((si) => Number(si.item_id) === Number(item.item_id));
        if (!suratItem) continue;

        const barangId = Number(suratItem.barang_id);

        const genericStock = await tx.stok_gudang.findFirst({
          where: {
            gudang_id: gudangTujuanId,
            barang_id: barangId,
            kondisi: "baik",
            bin_lokasi_id: null,
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

        const binStock = await tx.stok_gudang.findFirst({
          where: {
            gudang_id: gudangTujuanId,
            barang_id: barangId,
            bin_lokasi_id: binLokasiId,
            kondisi: "baik",
            project_id: shipment.project_id,
          },
        });

        let saldoSetelahBin = qty;
        if (binStock) {
          saldoSetelahBin = Number(binStock.qty || 0) + qty;
          await tx.stok_gudang.update({
            where: { stok_id: binStock.stok_id },
            data: { qty: saldoSetelahBin, updated_at: new Date() },
          });
        } else {
          const created = await tx.stok_gudang.create({
            data: {
              gudang_id: gudangTujuanId,
              barang_id: barangId,
              bin_lokasi_id: binLokasiId,
              project_id: shipment.project_id,
              kondisi: "baik",
              qty: qty,
            },
          });
          saldoSetelahBin = Number(created.qty);
        }

        await tx.stok_ledger.create({
          data: {
            surat_jalan_item_id: suratItem.item_id,
            barang_id: barangId,
            jenis_mutasi: "transfer",
            qty: qty,
            saldo_setelah: saldoSetelahBin,
          },
        });
      }

      await suratJalanRepository.updateStatus(suratJalanId, "disetujui", tx);

      if (actorId) {
        await suratJalanRepository.createApprovalLog(suratJalanId, actorId, "inbound_putaway", "disetujui", null, tx);
        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(suratJalanId),
            aksi: "putaway",
            actor_id: BigInt(actorId),
            data_sebelum: { status: shipment.status },
            data_sesudah: { status: "disetujui", surat_jalan_id: suratJalanId },
          },
        });
      }
    });

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

    await prisma.$transaction(async (tx) => {
      const gudangAsalId = Number(shipment.gudang_asal_id);

      for (const item of items) {
        const qty = Number(item.qty || 0);
        const binLokasiId = item.bin_lokasi_id ? Number(item.bin_lokasi_id) : null;

        if (qty <= 0) continue;
        if (!binLokasiId) continue;

        const suratItem = shipment.items.find((si) => Number(si.item_id) === Number(item.item_id));
        if (!suratItem) continue;

        const barangId = Number(suratItem.barang_id);

        const stock = await tx.stok_gudang.findFirst({
          where: {
            gudang_id: gudangAsalId,
            barang_id: barangId,
            bin_lokasi_id: binLokasiId,
            kondisi: "baik",
            project_id: shipment.project_id,
          },
          orderBy: { qty: "desc" },
        });

        if (!stock) {
          throw new AppError(
            `Stok barang ${barangId} di bin tidak ditemukan.`,
            400
          );
        }

        const existingQty = Number(stock.qty || 0);
        if (existingQty < qty) {
          throw new AppError(
            `Stok barang ${barangId} di bin tidak mencukupi (Tersedia: ${existingQty}, Dibutuhkan: ${qty}).`,
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
      }

      await suratJalanRepository.updateStatus(suratJalanId, "disetujui", tx);

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

    return await suratJalanRepository.findById(suratJalanId);
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
  };
