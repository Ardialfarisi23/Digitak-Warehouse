const dashboardRepository = require("./dashboard.repository");

const getStats = async () => {
  return await dashboardRepository.getStats();
};

const getProjectSummary = async () => {
  return await dashboardRepository.getProjectSummary();
};

module.exports = {
  getStats,
  getProjectSummary,
};
