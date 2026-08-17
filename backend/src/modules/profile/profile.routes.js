const express = require("express");

const router = express.Router();

const profileController = require("./profile.controller");
const { updateProfileSchema } = require("./profile.validation");
const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");

router.get("/", authenticate, profileController.getProfile);
router.patch(
  "/",
  authenticate,
  validate(updateProfileSchema),
  profileController.updateProfile
);

module.exports = router;
