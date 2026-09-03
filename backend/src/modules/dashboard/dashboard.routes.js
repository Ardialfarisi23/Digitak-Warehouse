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
router.put("/warehouse-assessment/:gudangId", authenticate, authorize("SUPERVISOR", "ADMIN"), dashboardController.updateWarehouseAssessment);

module.exports = router;
