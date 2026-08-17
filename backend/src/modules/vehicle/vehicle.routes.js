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
  authorize("ADMIN", "SUPERVISOR"),
  validate(createVehicleSchema),
  vehicleController.create
);

router.get("/", authenticate, vehicleController.findAll);
router.get("/:no_polisi", authenticate, vehicleController.findByNoPolisi);
router.put(
  "/:no_polisi",
  authenticate,
  authorize("ADMIN"),
  validate(updateVehicleSchema),
  vehicleController.update
);

module.exports = router;
