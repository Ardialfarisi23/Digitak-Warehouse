const express = require("express");

const router = express.Router();

const reconciliationController = require("./reconciliation.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const { getReconciliationInventorySchema, upsertRemainsNoteSchema } = require("./reconciliation.validation");
const validate = require("../../middlewares/validation.middleware");

router.get(
  "/inventory",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  reconciliationController.getInventory
);

router.put(
  "/remains-note",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(upsertRemainsNoteSchema),
  reconciliationController.saveRemainsNote
);

module.exports = router;
