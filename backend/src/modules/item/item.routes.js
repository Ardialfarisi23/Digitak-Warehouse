const express = require("express");

const router = express.Router();

const itemController = require("./item.controller");

const {
  createItemSchema,
  updateItemSchema,
} = require("./item.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createItemSchema),
  itemController.create
);

router.get("/", authenticate, itemController.findAll);
router.get("/:kode_perangkat", authenticate, itemController.findByKode);
router.put(
  "/:kode_perangkat",
  authenticate,
  authorize("ADMIN"),
  validate(updateItemSchema),
  itemController.update
);

module.exports = router;
