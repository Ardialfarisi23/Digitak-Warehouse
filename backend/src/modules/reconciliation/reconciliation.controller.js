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

const getFilterOptions = async (req, res, next) => {
  try {
    const actor = { id: req.user.id, role: req.user.role };
    const result = await reconciliationService.getFilterOptions(actor);
    return response.success(res, "Opsi filter rekonsiliasi berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const saveRemainsNote = async (req, res, next) => {
  try {
    const user = { id: req.user.id, role: req.user.role };
    const result = await reconciliationService.saveRemainsNote(req.body, user);
    return response.success(res, result ? "Catatan Remains disimpan." : "Catatan Remains dihapus.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInventory,
  getFilterOptions,
  saveRemainsNote,
};
