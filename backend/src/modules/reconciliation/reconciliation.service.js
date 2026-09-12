const reconciliationRepository = require("./reconciliation.repository");
const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");

const refreshTiketMosUsed = async (tiketId, tx) => {
  const client = tx || prisma;

  const aggregates = await client.laporan_mitra.groupBy({
    by: ["tiket_id"],
    where: {
      tiket_id: BigInt(tiketId),
      is_aktif: true,
    },
    _sum: {
      mos: true,
      used: true,
    },
  });

  const mos = aggregates[0]?._sum.mos ? Number(aggregates[0]._sum.mos) : 0;
  const used = aggregates[0]?._sum.used ? Number(aggregates[0]._sum.used) : 0;

  await client.tiket_material.update({
    where: { tiket_id: BigInt(tiketId) },
    data: { mos, used },
  });
};

const getInventory = async (filters = {}, actor = null) => {
  return await reconciliationRepository.getInventory(filters, actor);
};

const updateMosMitra = async (tiketId, mos, userId) => {
  const tiket = await prisma.tiket_material.findUnique({
    where: { tiket_id: BigInt(tiketId) },
  });

  if (!tiket) {
    throw new AppError("Tiket tidak ditemukan.", 404);
  }

  const mosSebelum = tiket.mos ? Number(tiket.mos) : 0;

  const result = await reconciliationRepository.updateMosMitra(tiketId, mos);

  try {
    await prisma.audit_log.create({
      data: {
        entity_type: "tiket_material",
        entity_id: BigInt(tiketId),
        aksi: "update_mos_mitra",
        actor_id: BigInt(userId),
        data_sebelum: { mos: mosSebelum },
        data_sesudah: { mos: Number(mos) },
      },
    });
  } catch (auditErr) {
    console.error("Gagal mencatat audit log update MOS Mitra:", auditErr);
  }

  return result;
};

module.exports = {
  getInventory,
  updateMosMitra,
  refreshTiketMosUsed,
};
