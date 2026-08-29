const express = require("express");

const router = express.Router();

const reconciliationController = require("./reconciliation.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validation.middleware");
const { getReconciliationInventorySchema, updateMosMitraSchema } = require("./reconciliation.validation");

router.get(
  "/inventory",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  reconciliationController.getInventory
);

router.put(
  "/tiket/:tiketId/mos-mitra",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(updateMosMitraSchema),
  reconciliationController.updateMosMitra
);

module.exports = router;
