const express = require("express");

const router = express.Router();

const vehicleController = require("./vehicle.controller");

const {
  createVehicleSchema,
  updateVehicleSchema,
} = require("./vehicle.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createVehicleSchema),
  vehicleController.create
);

router.get("/", authenticate, vehicleController.findAll);
router.get("/:no_polisi", authenticate, vehicleController.findByNoPolisi);
router.put(
  "/:no_polisi",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(updateVehicleSchema),
  vehicleController.update
);

router.delete(
  "/:kendaraan_id",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  vehicleController.remove
);

module.exports = router;
