const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");
const additionalRepository = require("./additional.repository");
const { createAuditLog } = require("../../utils/audit-log");
const { withSerializableRetry } = require("../../modules/return/return.utils");

const create = async (data, userId, userRole) => {
  if (userRole !== "admin_general" && userRole !== "supervisor") {
    throw new AppError("Hanya Supervisor dan Admin yang dapat membuat penyesuaian additional.", 403);
  }

  const { project_id, barang_id, qty, alasan } = data;

  const project = await prisma.project.findFirst({
    where: { project_id: BigInt(project_id) },
    select: { project_id: true, nama_project: true },
  });
  if (!project) {
    throw new AppError("Project tidak ditemukan.", 404);
  }

  const barang = await prisma.barang.findFirst({
    where: { barang_id: BigInt(barang_id) },
    select: { barang_id: true, nama_barang: true },
  });
  if (!barang) {
    throw new AppError("Barang tidak ditemukan.", 404);
  }

  const boqLink = await prisma.boq_item.findFirst({
    where: {
      barang_id: BigInt(barang_id),
      boq: {
        OR: [
          { tiket: { project_id: BigInt(project_id) } },
          { cluster: { project_id: BigInt(project_id) } },
        ],
      },
    },
    select: { boq_item_id: true },
  });

  const mosLink = await prisma.surat_jalan_item.findFirst({
    where: {
      barang_id: BigInt(barang_id),
      surat_jalan: { project_id: BigInt(project_id) },
    },
    select: { item_id: true },
  });

  if (!boqLink && !mosLink) {
    throw new AppError("Barang belum terdaftar pada project tersebut (tidak ditemukan di BOQ/MOS).", 400);
  }

  const actorId = Number(userId);
  const currentTotalBefore = await computeCurrentTotal(project_id, barang_id);

  if (currentTotalBefore + qty < 0) {
    throw new AppError(
      `Total additional tidak boleh negatif. Nilai saat ini: ${currentTotalBefore}, penyesuaian: ${qty}`,
      400
    );
  }

  await withSerializableRetry(async () => {
    await prisma.$transaction(
      async (tx) => {
        const result = await additionalRepository.createAdjustment(tx, {
          projectId: project_id,
          barangId: barang_id,
          qty,
          alasan: alasan.trim(),
          userId: actorId,
        });

        const currentTotalAfter = currentTotalBefore + qty;

        await tx.audit_log.create({
          data: {
            entity_type: "additional_adjustment",
            entity_id: BigInt(result.adjustment_id),
            aksi: "create",
            actor_id: BigInt(actorId),
            data_sebelum: {
              project_id: Number(project_id),
              barang_id: Number(barang_id),
              total_sebelum: currentTotalBefore,
            },
            data_sesudah: {
              project_id: Number(project_id),
              barang_id: Number(barang_id),
              qty: Number(result.qty),
              alasan: result.alasan,
              total_sesudah: currentTotalAfter,
            },
          },
        });

        return result;
      },
      { isolationLevel: "Serializable" }
    );
  });

  return {
    project_id: Number(project_id),
    barang_id: Number(barang_id),
    qty,
    alasan: alasan.trim(),
  };
};

const list = async (projectId, barangId, userRole) => {
  if (userRole !== "admin_general" && userRole !== "supervisor") {
    throw new AppError("Hanya Supervisor dan Admin yang dapat melihat penyesuaian additional.", 403);
  }

  const adjustments = await additionalRepository.listAdjustments(projectId, barangId);

  const adjustmentTotal = adjustments.reduce((sum, a) => sum + Number(a.qty || 0), 0);
  const kelebihanTotal = await computeKelebihanTotal(projectId, barangId);
  const totalAdditional = adjustmentTotal + kelebihanTotal;

  return {
    adjustments: adjustments.map((a) => ({
      adjustment_id: a.adjustment_id,
      qty: Number(a.qty),
      alasan: a.alasan,
      created_at: a.created_at,
      creator: a.creator ? { user_id: a.creator.user_id, nama: a.creator.nama } : null,
    })),
    total_additional: totalAdditional,
    rincian: {
      dari_kelebihan: kelebihanTotal,
      dari_penyesuaian: adjustmentTotal,
    },
  };
};

async function computeCurrentTotal(projectId, barangId) {
  const kelebihanTotal = await computeKelebihanTotal(projectId, barangId);
  const adjustmentTotal = await additionalRepository.getAdjustmentTotals([projectId]).then((map) => map.get(String(barangId)) || 0);
  return kelebihanTotal + adjustmentTotal;
}

async function computeKelebihanTotal(projectId, barangId) {
  const items = await prisma.surat_jalan_item.findMany({
    where: {
      barang_id: BigInt(barangId),
      is_kelebihan: true,
      surat_jalan: {
        tipe: "inbound",
        status: { in: ["disetujui", "diterima_didistribusikan"] },
        project_id: BigInt(projectId),
      },
    },
    select: { qty: true },
  });
  return items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
}

module.exports = {
  create,
  list,
};
