const express = require("express");

const router = express.Router();

const permintaanBoqController = require("./permintaan-boq.controller");

const {
  createPermintaanBoqSchema,
  updatePermintaanBoqStatusSchema,
} = require("./permintaan-boq.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(createPermintaanBoqSchema),
  permintaanBoqController.create
);

router.get("/", authenticate, permintaanBoqController.findAll);
router.get("/stats", authenticate, permintaanBoqController.getStats);
router.get("/:id", authenticate, permintaanBoqController.findById);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(updatePermintaanBoqStatusSchema),
  permintaanBoqController.updateStatus
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  permintaanBoqController.softDelete
);

router.patch(
  "/:id/restore",
  authenticate,
  authorize("ADMIN"),
  permintaanBoqController.restore
);

module.exports = router;
