const express = require("express");

const router = express.Router();

const titikLapanganController = require("./titik-lapangan.controller");
const {
  createTitikLapanganSchema,
  updateTitikLapanganSchema,
} = require("./titik-lapangan.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createTitikLapanganSchema),
  titikLapanganController.create
);

router.get("/", authenticate, titikLapanganController.findAll);
router.get("/:id", authenticate, titikLapanganController.findById);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateTitikLapanganSchema),
  titikLapanganController.update
);

router.delete("/:id", authenticate, authorize("ADMIN"), titikLapanganController.softDelete);
router.patch("/:id/restore", authenticate, authorize("ADMIN"), titikLapanganController.restore);

module.exports = router;
