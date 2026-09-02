const express = require("express");

const router = express.Router();

const personnelController = require("./personnel.controller");

const {
  createPersonnelSchema,
  updatePersonnelSchema,
} = require("./personnel.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(createPersonnelSchema),
  personnelController.create
);

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SUPERVISOR", "STAFF"),
  personnelController.findAll
);
router.get(
  "/:personil_id",
  authenticate,
  authorize("ADMIN", "SUPERVISOR", "STAFF"),
  personnelController.findByPersonilId
);
router.put(
  "/:personil_id",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(updatePersonnelSchema),
  personnelController.update
);

module.exports = router;