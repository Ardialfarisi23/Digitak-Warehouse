const express = require("express");

const router = express.Router();

const dashboardController = require("./dashboard.controller");
const authenticate = require("../../middlewares/auth.middleware");

router.get("/", authenticate, dashboardController.getStats);
router.get("/project-summary", authenticate, dashboardController.getProjectSummary);

module.exports = router;
