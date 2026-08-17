const express = require("express");

const router = express.Router();

const usersController = require("./users.controller");
const { createUserSchema, updateUserSchema } = require("./users.validation");
const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createUserSchema),
  usersController.create
);

router.get("/", authenticate, authorize("ADMIN"), usersController.findAll);
router.get("/:user_id", authenticate, authorize("ADMIN"), usersController.findById);
router.put(
  "/:user_id",
  authenticate,
  authorize("ADMIN"),
  validate(updateUserSchema),
  usersController.update
);

module.exports = router;
