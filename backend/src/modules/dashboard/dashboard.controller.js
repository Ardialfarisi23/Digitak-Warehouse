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

const getApprovalQueue = async (req, res, next) => {
  try {
    const result = await dashboardService.getApprovalQueue(req.user);
    return response.success(res, "Antrean approval berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getHardwareReconciliation = async (req, res, next) => {
  try {
    const result = await dashboardService.getHardwareReconciliation(req.query, req.user);
    return response.success(res, "Rekonsiliasi hardware berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getActivityLog = async (req, res, next) => {
  try {
    const result = await dashboardService.getActivityLog(req.query);
    return response.success(res, "Log aktivitas berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const updateWarehouseAssessment = async (req, res, next) => {
  try {
    const result = await dashboardService.updateWarehouseAssessment(req.params.gudangId, req.body, req.user);
    return response.success(res, "Penilaian kecukupan gudang berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const getWarehouseAssessment = async (req, res, next) => {
  try {
    const result = await dashboardService.getWarehouseAssessment(req.query, req.user);
    return response.success(res, "Data kecukupan gudang berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getProjectSummary,
  getApprovalQueue,
  getHardwareReconciliation,
  getActivityLog,
  updateWarehouseAssessment,
  getWarehouseAssessment,
};
