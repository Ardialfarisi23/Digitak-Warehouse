const express = require("express");

const router = express.Router();

const reportsController = require("./reports.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.get("/stock-history", authenticate, authorize("ADMIN"), reportsController.getStockHistory);
router.get("/audit-log", authenticate, authorize("ADMIN"), reportsController.getAuditLogs);
router.get("/rack-utilization", authenticate, authorize("ADMIN"), reportsController.getRackUtilization);
router.get("/hardware-reconciliation", authenticate, authorize("ADMIN"), reportsController.getHardwareReconciliation);
router.get("/hardware-reconciliation/per-tiket", authenticate, authorize("ADMIN"), reportsController.getHardwareReconciliationPerTiket);
router.get("/hardware-reconciliation/detailed", authenticate, authorize("ADMIN"), reportsController.getHardwareReconciliationDetailed);
router.get("/zone-utilization-history", authenticate, authorize("ADMIN"), reportsController.getZoneUtilizationHistory);
router.get("/zone-utilization", authenticate, authorize("ADMIN"), reportsController.getZoneUtilization);
router.post("/reconciliation/backfill", authenticate, authorize("ADMIN"), reportsController.backfillReconciliation);

router.post("/reconciliation/upload", authenticate, authorize("ADMIN", "SUPERVISOR"), reportsController.uploadReconciliationFile);
router.post("/reconciliation/confirm", authenticate, authorize("ADMIN", "SUPERVISOR"), reportsController.confirmReconciliationUpload);

module.exports = router;
