const reconciliationRepository = require("./reconciliation.repository");

const getInventory = async (filters = {}) => {
  return await reconciliationRepository.getInventory(filters);
};

module.exports = {
  getInventory,
};
