const reconciliationService = require("./reconciliation.service");
const response = require("../../shared/response");

const getInventory = async (req, res, next) => {
  try {
    const actor = { id: req.user.id, role: req.user.role };
    const result = await reconciliationService.getInventory(req.query, actor);
    return response.success(res, "Data rekonsiliasi inventory berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const updateMosMitra = async (req, res, next) => {
  try {
    const { tiketId } = req.params;
    const { mos } = req.body;
    const result = await reconciliationService.updateMosMitra(tiketId, mos, req.user.id);
    return response.success(res, "MOS Laporan Mitra berhasil diperbarui.", {
      tiketId: String(result.tiket_id),
      mos: Number(result.mos),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInventory,
  updateMosMitra,
};
