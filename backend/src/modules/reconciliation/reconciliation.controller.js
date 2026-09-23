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

module.exports = {
  getInventory,
};
