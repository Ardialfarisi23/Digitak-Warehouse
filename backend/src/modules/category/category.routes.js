const express = require("express");

const router = express.Router();

const categoryController = require("./category.controller");

const {
  createCategorySchema,
  updateCategorySchema,
} = require("./category.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createCategorySchema),
  categoryController.create
);

router.get("/", authenticate, categoryController.findAll);
router.get("/:code", authenticate, categoryController.findByCode);
router.put(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  validate(updateCategorySchema),
  categoryController.update
);
router.delete(
  "/:code",
  authenticate,
  authorize("ADMIN"),
  categoryController.softDelete
);
router.patch(
  "/:code/restore",
  authenticate,
  authorize("ADMIN"),
  categoryController.restore
);

module.exports = router;
