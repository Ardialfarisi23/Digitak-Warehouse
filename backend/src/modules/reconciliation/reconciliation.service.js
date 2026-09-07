const reconciliationRepository = require("./reconciliation.repository");
const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");

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
};
