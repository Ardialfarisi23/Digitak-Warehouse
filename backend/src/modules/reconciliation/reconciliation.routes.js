const express = require("express");

const router = express.Router();

const reconciliationController = require("./reconciliation.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const { getReconciliationInventorySchema } = require("./reconciliation.validation");

router.get(
  "/inventory",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  reconciliationController.getInventory
);

module.exports = router;
