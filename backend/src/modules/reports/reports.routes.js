const express = require("express");
const router = express.Router();

const reportsController = require("./reports.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const { uploadLimiter } = require("../../middlewares/rate-limit");

router.get("/stock-history", authenticate, authorize("ADMIN"), reportsController.getStockHistory);
router.get("/stock-history/export", authenticate, authorize("ADMIN"), reportsController.exportStockHistoryExcel);
router.get("/audit-log", authenticate, authorize("ADMIN"), reportsController.getAuditLogs);
router.get("/audit-log/export", authenticate, authorize("ADMIN"), reportsController.exportAuditLogExcel);
router.get("/reconciliation-upload-logs/filter-options", authenticate, authorize("ADMIN"), reportsController.getReconciliationUploadLogFilterOptions);
router.get("/reconciliation-upload-logs", authenticate, authorize("ADMIN"), reportsController.getReconciliationUploadLogs);
router.get("/reconciliation-upload-logs/:id/barang", authenticate, authorize("ADMIN"), reportsController.getReconciliationUploadLogBarang);
router.get(
  "/reconciliation/laporan-mitra",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  reportsController.getReconciliationReports
);
router.post(
  "/reconciliation/laporan-mitra/:laporan_id/nonaktifkan",
  authenticate,
  authorize("ADMIN"),
  reportsController.deactivateReconciliationReport
);
router.get("/hardware-reconciliation", authenticate, authorize("ADMIN"), reportsController.getHardwareReconciliation);
router.get("/hardware-reconciliation/per-tiket", authenticate, authorize("ADMIN"), reportsController.getHardwareReconciliationPerTiket);
router.get("/hardware-reconciliation/detailed", authenticate, authorize("ADMIN"), reportsController.getHardwareReconciliationDetailed);
router.get("/zone-utilization-history", authenticate, authorize("ADMIN"), reportsController.getZoneUtilizationHistory);
router.get("/zone-utilization", authenticate, authorize("ADMIN"), reportsController.getZoneUtilization);
// Template laporan mitra hanya boleh diunduh Admin (format = data input-sensitive).
router.get("/reconciliation/template", authenticate, authorize("ADMIN"), reportsController.downloadReconciliationTemplate);

router.post("/reconciliation/backfill", authenticate, authorize("ADMIN"), reportsController.backfillReconciliation);

// Input laporan mitra (upload Excel + submit konfirmasi) hanya boleh dilakukan Admin.
router.post(
  "/reconciliation/upload",
  authenticate,
  authorize("ADMIN"),
  uploadLimiter,
  reportsController.uploadReconciliationFile
);

router.post(
  "/reconciliation/confirm",
  authenticate,
  authorize("ADMIN"),
  reportsController.confirmReconciliationUpload
);

module.exports = router;