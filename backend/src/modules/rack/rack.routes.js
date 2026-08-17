const express = require("express");

const router = express.Router();

const rackController = require("./rack.controller");

const {
  createRackSchema,
  updateRackSchema,
} = require("./rack.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createRackSchema),
  rackController.create
);

router.get("/", authenticate, rackController.findAll);
router.get("/:code", authenticate, rackController.findByCode);
router.put(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  validate(updateRackSchema),
  rackController.update
);
router.delete(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  rackController.softDelete
);
router.patch(
  "/:code/restore",
  authenticate,
  authorize("ADMIN"),
  rackController.restore
);

module.exports = router;
