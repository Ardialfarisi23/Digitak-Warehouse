const express = require("express");

const router = express.Router();

const unitController = require("./unit.controller");

const {
  createUnitSchema,
  updateUnitSchema,
} = require("./unit.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createUnitSchema),
  unitController.create
);

router.get("/", authenticate, unitController.findAll);
router.get("/:code", authenticate, unitController.findByCode);
router.put(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  validate(updateUnitSchema),
  unitController.update
);
router.delete(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  unitController.softDelete
);
router.patch(
  "/:code/restore",
  authenticate,
  authorize("ADMIN"),
  unitController.restore
);

module.exports = router;
