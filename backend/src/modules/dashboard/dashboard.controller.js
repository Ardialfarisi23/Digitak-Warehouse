const dashboardService = require("./dashboard.service");
const response = require("../../shared/response");

const getStats = async (req, res, next) => {
  try {
    const result = await dashboardService.getStats();
    return response.success(res, "Statistik dashboard berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getProjectSummary = async (req, res, next) => {
  try {
    const result = await dashboardService.getProjectSummary();
    return response.success(
      res,
      "Ringkasan per Project/Cluster berhasil diambil.",
      result
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getProjectSummary,
};
