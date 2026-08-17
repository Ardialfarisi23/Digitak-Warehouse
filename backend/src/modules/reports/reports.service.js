const reportsRepository = require("./reports.repository");

const getStockHistory = async (filters = {}) => {
  return await reportsRepository.getStockHistory(filters);
};

const getAuditLogs = async (filters = {}) => {
  return await reportsRepository.getAuditLogs(filters);
};

const getRackUtilization = async () => {
  return await reportsRepository.getRackUtilization();
};

const getHardwareReconciliation = async (filters = {}) => {
  return await reportsRepository.getHardwareReconciliation(filters);
};

const getHardwareReconciliationPerTiket = async (filters = {}) => {
  return await reportsRepository.getHardwareReconciliationPerTiket(filters);
};

const getHardwareReconciliationDetailed = async (filters = {}) => {
  return await reportsRepository.getHardwareReconciliationDetailed(filters);
};

const getZoneUtilizationHistory = async (filters = {}) => {
  return await reportsRepository.getZoneUtilizationHistory(filters);
};

const getZoneUtilization = async (filters = {}) => {
  return await reportsRepository.getZoneUtilization(filters);
};

const backfillReconciliation = async () => {
  return await reportsRepository.backfillReconciliation();
};

module.exports = {
  getStockHistory,
  getAuditLogs,
  getRackUtilization,
  getHardwareReconciliation,
  getHardwareReconciliationPerTiket,
  getHardwareReconciliationDetailed,
  getZoneUtilizationHistory,
  getZoneUtilization,
  backfillReconciliation,
};
