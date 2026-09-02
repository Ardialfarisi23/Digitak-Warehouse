const suratJalanRepository = require("./surat-jalan.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const { PrismaClientKnownRequestError } = require("@prisma/client");

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

    return suratJalan;
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.", 400);
    }
    throw err;
  }
};

const createStaffInbound = async (data, actorId) => {
  const payload = {
    ...data,
    tipe: "inbound",
    status: "menunggu_verifikasi",
  };

  const result = await create(payload, actorId);

  await notificationService.create({
    role: "supervisor",
    type: "approval",
    title: "Inbound Menunggu Verifikasi",
    message: `Pengajuan inbound ${result?.nomor_surat_jalan || ""} menunggu verifikasi supervisor.`,
    link: "/dashboard/supervisor/approval/inbound",
  });

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
    // Ubah status menjadi 'ready_putaway' setelah approval supervisor,
    // bukan 'disetujui'. Status 'disetujui' akan dicapai setelah putaway.
    // Ini akan menghilangkannya dari antrean verifikasi.
    await suratJalanRepository.updateStatus(id, "ready_putaway", tx);

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
          data_sesudah: { status: "ready_putaway", surat_jalan_id: id },
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
      }

      // FIX (bug #6 looping): sebelumnya di-set "disetujui" lagi di sini —
      // sama persis kayak status yang di-set approveInbound(), jadi item
      // yang UDAH selesai ditempatkan nggak bisa dibedain dari yang BARU
      // di-ACC Supervisor. Sekarang pakai "diterima_didistribusikan"
      // sebagai penanda akhir proses inbound (barang sudah diterima &
      // ditempatkan tuntas).
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

    await suratJalanRepository.updateDeliveryStatus(id, updateData);

    if (actorId) {
      await suratJalanRepository.createApprovalLog(id, actorId, "outbound_delivery", newStatus === "sedang_dikirim" ? "sedang_dikirim" : "diterima_didistribusikan", body.catatan_distribusi || null);
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
  };