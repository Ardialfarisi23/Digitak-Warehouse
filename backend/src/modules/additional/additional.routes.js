const express = require("express");

const router = express.Router();

const additionalController = require("./additional.controller");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const { createAdjustmentSchema, listAdjustmentsSchema } = require("./additional.validation");

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(createAdjustmentSchema),
  additionalController.create
);

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(listAdjustmentsSchema, "query"),
  additionalController.list
);

module.exports = router;
