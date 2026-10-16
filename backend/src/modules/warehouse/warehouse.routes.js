const express = require("express");
const router = express.Router();

const warehouseController = require("./warehouse.controller");

const {
  createWarehouseSchema,
  updateWarehouseSchema,
} = require("./warehouse.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const { deleteLimiter } = require("../../middlewares/rate-limit");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createWarehouseSchema),
  warehouseController.create
);

router.get("/", authenticate, warehouseController.findAll);
router.get("/:nama_gudang", authenticate, warehouseController.findByNama);
router.put(
  "/:nama_gudang",
  authenticate,
  authorize("ADMIN"),
  validate(updateWarehouseSchema),
  warehouseController.update
);

router.delete(
  "/:nama_gudang",
  authenticate,
  authorize("ADMIN"),
  deleteLimiter,
  warehouseController.softDelete
);

router.patch("/:nama_gudang/restore", authenticate, authorize("ADMIN"), warehouseController.restore);

router.get("/:gudang_id/layout", authenticate, warehouseController.getLayout);
router.get("/:gudang_id/zona/:zona_id/stock-snapshot", authenticate, warehouseController.getZoneStockSnapshot);
router.get("/:gudang_id/stock-check", authenticate, warehouseController.getStockCheck);
router.get("/:gudang_id/picking-stock-check", authenticate, warehouseController.getPickingStockCheck);
router.get("/:gudang_id/picking-availability", authenticate, warehouseController.getPickingAvailability);

module.exports = router;