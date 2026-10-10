const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");
const { resolveFromTiket, resolveFromSuratJalanItem, warnNull } = require("../../utils/clusterResolver");
const { getBusinessDate, toPrismaDecimal, withSerializableRetry } = require("./return.utils");

const resolveMasterBarang = async (barangId) => {
  const idNum = BigInt(barangId);
  const barang = await prisma.barang.findUnique({
    where: { barang_id: idNum },
    select: { barang_id: true, nama_barang: true },
  });

  if (!barang) {
    return null;
  }

  return {
    barang_id: barang.barang_id,
    nama_barang: String(barang.nama_barang).trim(),
  };
};

const resolveLegacyBarangId = async (namaBarang) => {
  const namaTrimmed = String(namaBarang).trim();
  if (!namaTrimmed) {
    return null;
  }

  const count = await prisma.barang.count({
    where: { nama_barang: namaTrimmed },
  });

  if (count === 0) {
    return null;
  }

  if (count > 1) {
    return null;
  }

  const barang = await prisma.barang.findFirst({
    where: { nama_barang: namaTrimmed },
    select: { barang_id: true },
  });

  return barang ? String(barang.barang_id) : null;
};

const resolveMaterialIdentity = async (tiketId, barangId) => {
  const master = await resolveMasterBarang(barangId);
  if (!master) {
    return {
      resolved: false,
      reason: `Barang ${barangId} tidak ditemukan di master barang.`,
    };
  }

  return {
    resolved: true,
    barang_id: master.barang_id,
    nama_barang: master.nama_barang,
  };
};

const getLatestPhysicalSnapshot = async (tiketId, barangId) => {
  const identity = await resolveMaterialIdentity(tiketId, barangId);
  if (!identity.resolved) {
    return { snapshot: null, reason: identity.reason };
  }

  const tiketIdNum = BigInt(tiketId);
  const barangIdNum = BigInt(identity.barang_id);

  const where = {
    tiket_id: tiketIdNum,
    is_aktif: true,
    OR: [
      { barang_id: barangIdNum },
      {
        barang_id: null,
        nama_barang: identity.nama_barang,
      },
    ],
  };

  const candidates = await prisma.laporan_mitra.findMany({
    where,
    orderBy: [
      { tanggal_laporan: "desc" },
      { uploaded_at: "desc" },
      { laporan_id: "desc" },
    ],
    take: 1,
  });

  const latest = candidates[0];

  if (!latest) {
    return { snapshot: null, reason: "Tidak ada snapshot aktif untuk tiket dan material ini." };
  }

  return {
    snapshot: {
      laporan_id: latest.laporan_id,
      tiket_id: latest.tiket_id,
      project_id: latest.project_id,
      barang_id: latest.barang_id,
      nama_barang: latest.nama_barang,
      tanggal_laporan: latest.tanggal_laporan,
      remains_lapangan: toPrismaDecimal(latest.remains_lapangan ?? 0),
    },
    reason: null,
  };
};

const getApprovedReturnsAfterSnapshot = async (tiketId, barangId, snapshotTanggal) => {
  const tiketIdNum = BigInt(tiketId);
  const barangIdNum = BigInt(barangId);
  const snapshotBusinessDate = getBusinessDate(snapshotTanggal);

  const approvedReturns = await prisma.return_transaction.findMany({
    where: {
      tiket_id: tiketIdNum,
      barang_id: barangIdNum,
      status: { in: ["disetujui", "diterima_gudang"] },
    },
    select: {
      qty: true,
      effective_return_at: true,
    },
  });

  let approvedQty = toPrismaDecimal(0);

  for (const rt of approvedReturns) {
    const businessDate = getBusinessDate(rt.effective_return_at);
    if (businessDate > snapshotBusinessDate) {
      approvedQty = approvedQty.plus(toPrismaDecimal(rt.qty));
    }
  }

  return approvedQty;
};

const getCurrentFieldBalance = async (tiketId, barangId) => {
  const { snapshot, reason: snapshotReason } = await getLatestPhysicalSnapshot(tiketId, barangId);

  if (!snapshot) {
    return {
      tiket_id: tiketId,
      barang_id: barangId,
      latest_snapshot: null,
      approved_return_qty: toPrismaDecimal(0),
      current_field_balance: toPrismaDecimal(0),
      reason: snapshotReason,
    };
  }

  const approvedReturnQty = await getApprovedReturnsAfterSnapshot(
    tiketId,
    barangId,
    snapshot.tanggal_laporan
  );

  const currentFieldBalance = snapshot.remains_lapangan.minus(approvedReturnQty);

  return {
    tiket_id: tiketId,
    barang_id: barangId,
    latest_snapshot: snapshot,
    approved_return_qty: approvedReturnQty,
    current_field_balance: currentFieldBalance,
    reason: null,
  };
};

const validateBaselineLaporan = async (baselineLaporanId, tiketId, barangId) => {
  const baseline = await prisma.laporan_mitra.findUnique({
    where: { laporan_id: BigInt(baselineLaporanId) },
    select: {
      laporan_id: true,
      tiket_id: true,
      barang_id: true,
      nama_barang: true,
      is_aktif: true,
    },
  });

  if (!baseline) {
    return {
      valid: false,
      reason: `Baseline laporan ${baselineLaporanId} tidak ditemukan.`,
    };
  }

  if (baseline.tiket_id !== BigInt(tiketId)) {
    return {
      valid: false,
      reason: `Baseline laporan ${baselineLaporanId} bukan untuk ticket ${tiketId}.`,
    };
  }

  let materialMatch = false;
  let ambiguous = false;
  let unresolved = false;

  if (baseline.barang_id && baseline.barang_id === BigInt(barangId)) {
    materialMatch = true;
  } else if (!baseline.barang_id && baseline.nama_barang) {
    const resolvedBarangId = await resolveLegacyBarangId(baseline.nama_barang);
    if (resolvedBarangId === null) {
      unresolved = true;
    } else if (resolvedBarangId === String(barangId)) {
      materialMatch = true;
    } else {
      materialMatch = false;
    }
  }

  if (!materialMatch && !unresolved) {
    return {
      valid: false,
      reason: `Baseline laporan ${baselineLaporanId} bukan untuk material ${barangId}.`,
    };
  }

  if (unresolved) {
    return {
      valid: false,
      reason: `Baseline laporan ${baselineLaporanId} memiliki barang_id NULL dan nama_barang tidak dapat di-resolve ke material ${barangId}.`,
    };
  }

  if (ambiguous) {
    return {
      valid: false,
      reason: `Baseline laporan ${baselineLaporanId} memiliki nama_barang yang ambigu.`,
    };
  }

  return {
    valid: true,
    baseline: {
      laporan_id: baseline.laporan_id,
      tiket_id: baseline.tiket_id,
      barang_id: baseline.barang_id,
      nama_barang: baseline.nama_barang,
      is_aktif: baseline.is_aktif,
    },
    reason: null,
  };
};

const getReturnProjectConsistency = async (returnId) => {
  const rt = await prisma.return_transaction.findUnique({
    where: { return_id: BigInt(returnId) },
    select: {
      return_id: true,
      project_id: true,
      tiket_id: true,
      tiket: {
        select: {
          project_id: true,
        },
      },
    },
  });

  if (!rt) {
    return {
      checked: false,
      reason: `Return ${returnId} tidak ditemukan.`,
    };
  }

  const consistent = rt.tiket?.project_id != null && rt.project_id === rt.tiket.project_id;

  return {
    checked: true,
    return_id: rt.return_id,
    return_project_id: rt.project_id,
    ticket_project_id: rt.tiket.project_id,
    consistent,
    reason: consistent ? null : `Return project_id ${rt.project_id} tidak konsisten dengan ticket project_id ${rt.tiket.project_id}.`,
  };
};

const createReturn = async (data) => {
  const tiket = await prisma.tiket_material.findUnique({
    where: { tiket_id: BigInt(data.tiketId) },
    select: {
      tiket_id: true,
      project_id: true,
      kode_tiket: true,
    },
  });

  if (!tiket) {
    throw new AppError(`Ticket ${data.tiketId} tidak ditemukan.`, 404);
  }

  if (tiket.project_id !== BigInt(data.projectId)) {
    throw new AppError(`Project ID ${data.projectId} tidak konsisten dengan ticket ${data.tiketId}.`, 400);
  }

  const masterBarang = await resolveMasterBarang(data.barangId);
  if (!masterBarang) {
    throw new AppError(`Barang ${data.barangId} tidak ditemukan di master barang.`, 404);
  }

  const baselineValidation = await validateBaselineLaporan(data.baselineLaporanId, data.tiketId, data.barangId);
  if (!baselineValidation.valid) {
    throw new AppError(baselineValidation.reason, 400);
  }

  const qtyDecimal = toPrismaDecimal(data.qty);
  if (qtyDecimal.lte(0)) {
    throw new AppError("Qty harus lebih besar dari 0.", 400);
  }

  const effectiveReturnAt = new Date(data.effectiveReturnAt);
  if (Number.isNaN(effectiveReturnAt.getTime())) {
    throw new AppError("effective_return_at tidak valid.", 400);
  }

  const returnRecord = await prisma.return_transaction.create({
    data: {
      tiket_id: BigInt(data.tiketId),
      project_id: BigInt(data.projectId),
      barang_id: BigInt(data.barangId),
      baseline_laporan_id: BigInt(data.baselineLaporanId),
      surat_jalan_item_id: data.suratJalanItemId ? BigInt(data.suratJalanItemId) : null,
      cluster_id: (async () => {
        const fromTiket = await resolveFromTiket(prisma, data.tiketId);
        if (fromTiket) return fromTiket;
        if (data.suratJalanItemId) {
          const fromSji = await resolveFromSuratJalanItem(prisma, data.suratJalanItemId);
          if (fromSji) return fromSji;
        }
        return null;
      })(),
      qty: qtyDecimal,
      status: "draft",
      effective_return_at: effectiveReturnAt,
      created_by: BigInt(data.createdBy),
      note: data.note || null,
      reason: data.reason || null,
    },
    select: {
      return_id: true,
      tiket_id: true,
      project_id: true,
      barang_id: true,
      baseline_laporan_id: true,
      surat_jalan_item_id: true,
      qty: true,
      status: true,
      effective_return_at: true,
      created_by: true,
      approved_by: true,
      approved_at: true,
      received_by: true,
      received_at: true,
      note: true,
      reason: true,
      created_at: true,
    },
  });

  return returnRecord;
};

const submitReturn = async (returnId, actorId) => {
  const returnRecord = await prisma.return_transaction.findUnique({
    where: { return_id: BigInt(returnId) },
    select: {
      return_id: true,
      status: true,
      tiket_id: true,
      barang_id: true,
      project_id: true,
      tiket: {
        select: {
          project_id: true,
        },
      },
    },
  });

  if (!returnRecord) {
    throw new AppError("Return tidak ditemukan.", 404);
  }

  if (returnRecord.status !== "draft") {
    throw new AppError(`Return tidak dalam status draft. Status saat ini: ${returnRecord.status}`, 400);
  }

  if (returnRecord.project_id !== returnRecord.tiket.project_id) {
    throw new AppError("Return project_id tidak konsisten dengan ticket.", 400);
  }

  const updated = await prisma.return_transaction.updateMany({
    where: {
      return_id: BigInt(returnId),
      status: "draft",
    },
    data: {
      status: "diajukan",
    },
  });

  if (updated.count === 0) {
    throw new AppError("Gagal mengajukan return. Status mungkin sudah berubah.", 409);
  }

  const submitted = await prisma.return_transaction.findUnique({
    where: { return_id: BigInt(returnId) },
    select: {
      return_id: true,
      status: true,
      tiket_id: true,
      project_id: true,
      barang_id: true,
      baseline_laporan_id: true,
      surat_jalan_item_id: true,
      qty: true,
      effective_return_at: true,
      created_by: true,
      approved_by: true,
      approved_at: true,
      received_by: true,
      received_at: true,
      note: true,
      reason: true,
      created_at: true,
    },
  });

  return submitted;
};

const approveReturn = async (returnId, actorId) => {
  await withSerializableRetry(async () => {
    await prisma.$transaction(
      async (tx) => {
        const returnRecord = await tx.return_transaction.findUnique({
          where: { return_id: BigInt(returnId) },
          select: {
            return_id: true,
            status: true,
            tiket_id: true,
            barang_id: true,
            project_id: true,
            baseline_laporan_id: true,
            qty: true,
            effective_return_at: true,
            tiket: {
              select: {
                project_id: true,
                kode_tiket: true,
              },
            },
          },
        });

        if (!returnRecord) {
          throw new AppError("Return tidak ditemukan.", 404);
        }

        if (returnRecord.status !== "diajukan") {
          throw new AppError(`Return tidak dalam status diajukan. Status saat ini: ${returnRecord.status}`, 400);
        }

if (returnRecord.tiket?.project_id != null && returnRecord.project_id !== returnRecord.tiket.project_id) {
    throw new AppError("Return project_id tidak konsisten dengan ticket.", 400);
  }

        const baselineValidation = await validateBaselineLaporan(returnRecord.baseline_laporan_id, returnRecord.tiket_id, returnRecord.barang_id);
        if (!baselineValidation.valid) {
          throw new AppError(`Baseline tidak valid: ${baselineValidation.reason}`, 400);
        }

        const qtyDecimal = toPrismaDecimal(returnRecord.qty);
        if (qtyDecimal.lte(0)) {
          throw new AppError("Qty return harus lebih besar dari 0.", 400);
        }

        await tx.return_transaction.update({
          where: { return_id: BigInt(returnId) },
          data: {
            status: "disetujui",
            approved_by: BigInt(actorId),
            approved_at: new Date(),
          },
        });

        await tx.audit_log.create({
          data: {
            entity_type: "return_transaction",
            entity_id: BigInt(returnId),
            aksi: "approve",
            actor_id: BigInt(actorId),
            data_sebelum: { status: "diajukan", qty: returnRecord.qty.toString() },
            data_sesudah: { status: "disetujui", return_id: returnId },
          },
        });

        await tx.approval_log.create({
          data: {
            entity_type: "return_transaction",
            entity_id: Number(returnId),
            tahap: "return_approval",
            status: "disetujui",
            approver_id: Number(actorId),
            catatan: null,
          },
        });
      },
      { isolationLevel: "Serializable" }
    );
  });

  const approved = await prisma.return_transaction.findUnique({
    where: { return_id: BigInt(returnId) },
    select: {
      return_id: true,
      status: true,
      tiket_id: true,
      project_id: true,
      barang_id: true,
      baseline_laporan_id: true,
      surat_jalan_item_id: true,
      qty: true,
      effective_return_at: true,
      created_by: true,
      approved_by: true,
      approved_at: true,
      received_by: true,
      received_at: true,
      note: true,
      reason: true,
      created_at: true,
    },
  });

  return approved;
};

const rejectReturn = async (returnId, actorId, reason = null) => {
  const returnRecord = await prisma.return_transaction.findUnique({
    where: { return_id: BigInt(returnId) },
    select: {
      return_id: true,
      status: true,
      tiket_id: true,
      project_id: true,
      barang_id: true,
      baseline_laporan_id: true,
      qty: true,
      effective_return_at: true,
      tiket: {
        select: {
          project_id: true,
        },
      },
    },
  });

  if (!returnRecord) {
    throw new AppError("Return tidak ditemukan.", 404);
  }

if (returnRecord.status !== "diajukan") {
      throw new AppError(`Return tidak dalam status diajukan. Status saat ini: ${returnRecord.status}`, 400);
    }

  if (returnRecord.tiket?.project_id != null && returnRecord.project_id !== returnRecord.tiket.project_id) {
    throw new AppError("Return project_id tidak konsisten dengan ticket.", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.return_transaction.updateMany({
      where: {
        return_id: BigInt(returnId),
        status: "diajukan",
      },
      data: {
        status: "ditolak",
        reason: reason || null,
      },
    });

    if (result.count === 0) {
      throw new AppError("Gagal menolak return. Status mungkin sudah berubah.", 409);
    }

    await tx.audit_log.create({
      data: {
        entity_type: "return_transaction",
        entity_id: BigInt(returnId),
        aksi: "reject_outbound",
        actor_id: BigInt(actorId),
        data_sebelum: { status: "diajukan", qty: returnRecord.qty.toString() },
        data_sesudah: { status: "ditolak", return_id: returnId, reason: reason || null },
      },
    });

    await tx.approval_log.create({
      data: {
        entity_type: "return_transaction",
        entity_id: Number(returnId),
        tahap: "return_approval",
        status: "ditolak",
        approver_id: Number(actorId),
        catatan: reason || null,
      },
    });

    return result.count;
  });

  const rejected = await prisma.return_transaction.findUnique({
    where: { return_id: BigInt(returnId) },
    select: {
      return_id: true,
      status: true,
      tiket_id: true,
      project_id: true,
      barang_id: true,
      baseline_laporan_id: true,
      surat_jalan_item_id: true,
      qty: true,
      effective_return_at: true,
      created_by: true,
      approved_by: true,
      approved_at: true,
      received_by: true,
      received_at: true,
      note: true,
      reason: true,
      created_at: true,
    },
  });

  return rejected;
};

const addReturnStock = async (returnRecord, gudangTujuanId, tx) => {
  const qtyDecimal = toPrismaDecimal(returnRecord.qty);
  const barangId = Number(returnRecord.barang_id);
  const projectId = Number(returnRecord.project_id);
  const gudangId = Number(gudangTujuanId);

  const existingStock = await tx.stok_gudang.findFirst({
    where: {
      gudang_id: gudangId,
      barang_id: barangId,
      kondisi: "baik",
      zona_id: null,
    },
    orderBy: { stok_id: "asc" },
  });

  let saldoSetelah;

  if (existingStock) {
    const existingQty = toPrismaDecimal(existingStock.qty || 0);
    const newQty = existingQty.plus(qtyDecimal);
    saldoSetelah = newQty;

    await tx.stok_gudang.update({
      where: { stok_id: existingStock.stok_id },
      data: {
        qty: newQty,
        updated_at: new Date(),
      },
    });
  } else {
    const newStock = await tx.stok_gudang.create({
      data: {
        gudang_id: gudangId,
        barang_id: barangId,
        project_id: null,
        kondisi: "baik",
        qty: qtyDecimal,
        zona_id: null,
      },
    });

    saldoSetelah = toPrismaDecimal(newStock.qty);
  }

  await tx.stok_ledger.create({
    data: {
      surat_jalan_item_id: returnRecord.surat_jalan_item_id ? Number(returnRecord.surat_jalan_item_id) : null,
      return_transaction_id: Number(returnRecord.return_id),
      barang_id: barangId,
      cluster_id: (async () => {
        const fromSji = returnRecord.surat_jalan_item_id
          ? await prisma.surat_jalan_item.findUnique({ where: { item_id: Number(returnRecord.surat_jalan_item_id) }, select: { cluster_id: true } })
          : null;
        if (fromSji?.cluster_id) return fromSji.cluster_id;
        const fromRt = await prisma.return_transaction.findUnique({ where: { return_id: Number(returnRecord.return_id) }, select: { cluster_id: true } });
        return fromRt?.cluster_id || null;
      })(),
      jenis_mutasi: "in",
      qty: qtyDecimal,
      saldo_setelah: saldoSetelah,
    },
  });
};

const receiveReturn = async (returnId, actorId, gudangTujuanId) => {
  const returnRecord = await prisma.return_transaction.findUnique({
    where: { return_id: BigInt(returnId) },
    select: {
      return_id: true,
      status: true,
      tiket_id: true,
      project_id: true,
      barang_id: true,
      baseline_laporan_id: true,
      surat_jalan_item_id: true,
      qty: true,
      effective_return_at: true,
      tiket: {
        select: {
          project_id: true,
        },
      },
    },
  });

  if (!returnRecord) {
    throw new AppError("Return tidak ditemukan.", 404);
  }

if (returnRecord.status !== "disetujui") {
      throw new AppError(`Return tidak dalam status disetujui. Status saat ini: ${returnRecord.status}`, 400);
    }

  if (returnRecord.tiket?.project_id != null && returnRecord.project_id !== returnRecord.tiket.project_id) {
    throw new AppError("Return project_id tidak konsisten dengan ticket.", 400);
  }

  const gudang = await prisma.gudang.findUnique({
    where: { gudang_id: BigInt(gudangTujuanId) },
    select: {
      gudang_id: true,
      nama_gudang: true,
      is_aktif: true,
    },
  });

  if (!gudang) {
    throw new AppError("Gudang tujuan tidak ditemukan.", 404);
  }

  if (!gudang.is_aktif) {
    throw new AppError("Gudang tujuan tidak aktif.", 400);
  }

  const qtyDecimal = toPrismaDecimal(returnRecord.qty);
  if (qtyDecimal.lte(0)) {
    throw new AppError("Qty return harus lebih besar dari 0.", 400);
  }

  await prisma.$transaction(
    async (tx) => {
      const transitionResult = await tx.return_transaction.updateMany({
        where: {
          return_id: BigInt(returnId),
          status: "disetujui",
        },
        data: {
          status: "diterima_gudang",
          received_by: BigInt(actorId),
          received_at: new Date(),
        },
      });

      if (transitionResult.count === 0) {
        throw new AppError("Gagal menerima return. Status mungkin sudah berubah.", 409);
      }

      await addReturnStock(returnRecord, gudangTujuanId, tx);

      await tx.approval_log.create({
        data: {
          entity_type: "return_transaction",
          entity_id: Number(returnId),
          tahap: "return_receive",
          status: "disetujui",
          approver_id: Number(actorId),
          catatan: null,
        },
      });

      await tx.audit_log.create({
        data: {
          entity_type: "return_transaction",
          entity_id: BigInt(returnId),
          aksi: "receive_inbound",
          actor_id: BigInt(actorId),
          data_sebelum: { status: "disetujui", qty: returnRecord.qty.toString() },
          data_sesudah: { status: "diterima_gudang", return_id: returnId, gudang_tujuan_id: Number(gudangTujuanId) },
        },
      });
    },
    { isolationLevel: "Serializable" }
  );

  const received = await prisma.return_transaction.findUnique({
    where: { return_id: BigInt(returnId) },
    select: {
      return_id: true,
      status: true,
      tiket_id: true,
      project_id: true,
      barang_id: true,
      baseline_laporan_id: true,
      surat_jalan_item_id: true,
      qty: true,
      effective_return_at: true,
      created_by: true,
      approved_by: true,
      approved_at: true,
      received_by: true,
      received_at: true,
      note: true,
      reason: true,
      created_at: true,
    },
  });

  return received;
};

const getReturns = async (filters = {}) => {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.max(parseInt(filters.limit, 10) || 20, 1);
  const skip = (page - 1) * limit;

  const where = {};

  const status = filters.status;
  if (status && ["draft", "diajukan", "disetujui", "ditolak", "diterima_gudang"].includes(status)) {
    where.status = status;
  }

  const tiketId = filters.tiket_id;
  if (tiketId && String(tiketId).trim() !== "") {
    where.tiket_id = BigInt(tiketId);
  }

  const projectId = filters.project_id;
  if (projectId && String(projectId).trim() !== "") {
    where.project_id = BigInt(projectId);
  }

  const barangId = filters.barang_id;
  if (barangId && String(barangId).trim() !== "") {
    where.barang_id = BigInt(barangId);
  }

  const search = filters.search;
  if (search && String(search).trim() !== "") {
    where.OR = [
      { tiket: { kode_tiket: { contains: search.trim(), mode: "insensitive" } } },
      { barang: { nama_barang: { contains: search.trim(), mode: "insensitive" } } },
      { barang: { kode_perangkat: { contains: search.trim(), mode: "insensitive" } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.return_transaction.findMany({
      where,
      orderBy: [
        { created_at: "desc" },
        { return_id: "desc" },
      ],
      skip,
      take: limit,
      include: {
        tiket: {
          select: {
            tiket_id: true,
            kode_tiket: true,
            project_id: true,
          },
        },
        project: {
          select: {
            project_id: true,
            nama_project: true,
          },
        },
        barang: {
          select: {
            barang_id: true,
            kode_perangkat: true,
            nama_barang: true,
          },
        },
        baseline_laporan: {
          select: {
            laporan_id: true,
            tanggal_laporan: true,
            nama_barang: true,
            barang_id: true,
            remains_lapangan: true,
            is_aktif: true,
            pic_mitra: true,
          },
        },
        surat_jalan_item: {
          include: {
            surat_jalan: {
              select: {
                nomor_surat_jalan: true,
                tipe: true,
                status: true,
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
        approver: {
          select: {
            nama: true,
            role: true,
          },
        },
        receiver: {
          select: {
            nama: true,
            role: true,
          },
        },
      },
    }),
    prisma.return_transaction.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getReturnById = async (returnId) => {
  const record = await prisma.return_transaction.findUnique({
    where: { return_id: BigInt(returnId) },
    include: {
      tiket: {
        select: {
          tiket_id: true,
          kode_tiket: true,
          project_id: true,
          area: true,
        },
      },
      project: {
        select: {
          project_id: true,
          nama_project: true,
          area: true,
        },
      },
      barang: {
        select: {
          barang_id: true,
          kode_perangkat: true,
          nama_barang: true,
        },
      },
      baseline_laporan: {
        select: {
          laporan_id: true,
          tanggal_laporan: true,
          nama_barang: true,
          barang_id: true,
          used: true,
          remains_lapangan: true,
          mos: true,
          is_aktif: true,
          pic_mitra: true,
          catatan: true,
          kondisi: true,
        },
      },
      surat_jalan_item: {
        include: {
          surat_jalan: {
            select: {
              surat_jalan_id: true,
              nomor_surat_jalan: true,
              tipe: true,
              status: true,
              gudang_asal_id: true,
              gudang_tujuan_id: true,
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
      approver: {
        select: {
          nama: true,
          role: true,
        },
      },
      receiver: {
        select: {
          nama: true,
          role: true,
        },
      },
      stok_ledgers: {
        orderBy: { waktu_mutasi: "desc" },
        take: 10,
        select: {
          ledger_id: true,
          jenis_mutasi: true,
          qty: true,
          saldo_setelah: true,
          waktu_mutasi: true,
          surat_jalan_item_id: true,
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  return record;
};

const getBaselineReference = async (filters = {}) => {
  const { tiket_id, barang_id } = filters;

  if (!tiket_id || !barang_id) {
    return [];
  }

  const tiketIdNum = BigInt(tiket_id);
  const barangIdNum = BigInt(barang_id);

  const material = await prisma.barang.findUnique({
    where: { barang_id: barangIdNum },
    select: { barang_id: true, nama_barang: true },
  });

  if (!material) {
    return [];
  }

  const candidates = await prisma.laporan_mitra.findMany({
    where: {
      tiket_id: tiketIdNum,
      OR: [
        { barang_id: barangIdNum },
        {
          barang_id: null,
          nama_barang: material.nama_barang ? String(material.nama_barang).trim() : undefined,
        },
      ],
    },
    select: {
      laporan_id: true,
      tiket_id: true,
      project_id: true,
      barang_id: true,
      nama_barang: true,
      tanggal_laporan: true,
      used: true,
      remains_lapangan: true,
      mos: true,
      is_aktif: true,
      pic_mitra: true,
      catatan: true,
      kondisi: true,
      uploaded_at: true,
    },
    orderBy: [
      { tanggal_laporan: "desc" },
      { uploaded_at: "desc" },
      { laporan_id: "desc" },
    ],
  });

  return candidates;
};

const getSuratJalanItemReference = async (filters = {}) => {
  const { barang_id } = filters;

  if (!barang_id) {
    return [];
  }

  const barangIdNum = BigInt(barang_id);

  const items = await prisma.surat_jalan_item.findMany({
    where: {
      barang_id: barangIdNum,
      surat_jalan: {
        // Status transit tetap dianggap pengiriman aktif untuk referensi return.
        status: { in: ["disetujui", "diterima_didistribusikan", "sedang_dikirim", "tiba_di_transit"] },
      },
    },
    select: {
      item_id: true,
      surat_jalan_id: true,
      barang_id: true,
      qty: true,
      kondisi: true,
      nomor_seri: true,
      catatan: true,
      is_kelebihan: true,
      surat_jalan: {
        select: {
          surat_jalan_id: true,
          nomor_surat_jalan: true,
          tipe: true,
          status: true,
          tanggal: true,
          tujuan_tipe: true,
          project_id: true,
          gudang_asal: {
            select: {
              gudang_id: true,
              nama_gudang: true,
            },
          },
          gudang_tujuan: {
            select: {
              gudang_id: true,
              nama_gudang: true,
            },
          },
          boq: {
            select: {
              boq_id: true,
              tiket: {
                select: {
                  tiket_id: true,
                  kode_tiket: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { item_id: "desc" },
    take: 100,
  });

  return items;
};

module.exports = {
  resolveMasterBarang,
  resolveLegacyBarangId,
  resolveMaterialIdentity,
  getLatestPhysicalSnapshot,
  getApprovedReturnsAfterSnapshot,
  getCurrentFieldBalance,
  validateBaselineLaporan,
  getReturnProjectConsistency,
  createReturn,
  submitReturn,
  approveReturn,
  rejectReturn,
  receiveReturn,
  getReturns,
  getReturnById,
  getBaselineReference,
  getSuratJalanItemReference,
};
