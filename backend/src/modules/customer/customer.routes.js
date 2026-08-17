const express = require("express");

const router = express.Router();

const customerController = require("./customer.controller");

const {
  createCustomerSchema,
  updateCustomerSchema,
} = require("./customer.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createCustomerSchema),
  customerController.create
);

router.get("/", authenticate, customerController.findAll);
router.get("/:code", authenticate, customerController.findByCode);
router.put(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  validate(updateCustomerSchema),
  customerController.update
);
router.delete(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  customerController.softDelete
);
router.patch(
  "/:code/restore",
  authenticate,
  authorize("ADMIN"),
  customerController.restore
);

module.exports = router;
