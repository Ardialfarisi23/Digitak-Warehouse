const express = require("express");

const router = express.Router();

const zoneController = require("./zone.controller");

const {
  createZoneSchema,
  updateZoneSchema,
  updateZoneUtilizationSchema,
} = require("./zone.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createZoneSchema),
  zoneController.create
);

router.get("/", authenticate, zoneController.findAll);
router.get("/:code", authenticate, zoneController.findByCode);
router.put(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  validate(updateZoneSchema),
  zoneController.update
);
router.delete(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  zoneController.softDelete
);
router.patch(
  "/:code/restore",
  authenticate,
  authorize("ADMIN"),
  zoneController.restore
);
router.patch(
  "/:zona_id/utilization-status",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(updateZoneUtilizationSchema),
  zoneController.updateUtilizationStatus
);

module.exports = router;
