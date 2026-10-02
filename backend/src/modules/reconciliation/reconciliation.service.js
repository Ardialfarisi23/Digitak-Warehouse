const reconciliationRepository = require("./reconciliation.repository");
const prisma = require("../../config/prisma");

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

module.exports = {
  getInventory,
  refreshTiketMosUsed,
};
