const express = require("express");
const router = express.Router();
const { uploadFile, uploadBoqReference } = require("./upload.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const { uploadLimiter } = require("../../middlewares/rate-limit");

router.post("/", authenticate, uploadLimiter, uploadFile);

router.post(
  "/boq-reference",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  uploadLimiter,
  uploadBoqReference
);

module.exports = router;