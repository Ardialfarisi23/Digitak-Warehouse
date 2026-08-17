const express = require("express");

const router = express.Router();

const supplierController = require("./supplier.controller");

const {
  createSupplierSchema,
  updateSupplierSchema,
} = require("./supplier.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createSupplierSchema),
  supplierController.create
);

router.get("/", authenticate, supplierController.findAll);
router.get("/:code", authenticate, supplierController.findByCode);
router.put(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  validate(updateSupplierSchema),
  supplierController.update
);
router.delete(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  supplierController.softDelete
);
router.patch(
  "/:code/restore",
  authenticate,
  authorize("ADMIN"),
  supplierController.restore
);

module.exports = router;
