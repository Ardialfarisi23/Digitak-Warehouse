const express = require("express");

const router = express.Router();

const binController = require("./bin.controller");

const {
  createBinSchema,
  updateBinSchema,
} = require("./bin.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createBinSchema),
  binController.create
);

router.get("/", authenticate, binController.findAll);
router.get("/:code", authenticate, binController.findByCode);
router.put(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  validate(updateBinSchema),
  binController.update
);
router.delete(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  binController.softDelete
);
router.patch(
  "/:code/restore",
  authenticate,
  authorize("ADMIN"),
  binController.restore
);

module.exports = router;
