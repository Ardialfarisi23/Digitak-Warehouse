const express = require("express");

const router = express.Router();

const aisleController = require("./aisle.controller");

const {
  createAisleSchema,
  updateAisleSchema,
} = require("./aisle.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createAisleSchema),
  aisleController.create
);

router.get("/", authenticate, aisleController.findAll);
router.get("/:code", authenticate, aisleController.findByCode);
router.put(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  validate(updateAisleSchema),
  aisleController.update
);
router.delete(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  aisleController.softDelete
);
router.patch(
  "/:code/restore",
  authenticate,
  authorize("ADMIN"),
  aisleController.restore
);

module.exports = router;
