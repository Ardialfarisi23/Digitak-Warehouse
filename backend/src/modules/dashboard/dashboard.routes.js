const express = require("express");

const router = express.Router();

const dashboardController = require("./dashboard.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.get("/", authenticate, dashboardController.getStats);
router.get("/project-summary", authenticate, dashboardController.getProjectSummary);
router.get("/approvals", authenticate, dashboardController.getApprovalQueue);
router.get("/reconciliation", authenticate, dashboardController.getHardwareReconciliation);
router.get("/activities", authenticate, dashboardController.getActivityLog);
router.get("/warehouse-assessment", authenticate, dashboardController.getWarehouseAssessment);
// @deprecated since 2026-09-05 (Gelombang 3 task) — endpoint bulk override ini
// akan dihapus setelah Gelombang 4 frontend selesai migrasi ke endpoint
// granular per-zona. Sementara endpoint ini tetap aktif untuk backward-compat.
// Pengganti: PATCH /api/zones/:zona_id/utilization-status (per-zona, lebih presisi).
router.put("/warehouse-assessment/:gudangId", authenticate, authorize("SUPERVISOR", "ADMIN"), dashboardController.updateWarehouseAssessment);

module.exports = router;
