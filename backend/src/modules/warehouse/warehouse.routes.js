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
router.delete("/:nama_gudang", authenticate, authorize("ADMIN"), warehouseController.softDelete);
router.patch("/:nama_gudang/restore", authenticate, authorize("ADMIN"), warehouseController.restore);
router.get("/:nama_gudang/layout", authenticate, warehouseController.getLayout);
router.get("/:nama_gudang/zona/:zona_id/stock-snapshot", authenticate, warehouseController.getZoneStockSnapshot);

module.exports = router;
