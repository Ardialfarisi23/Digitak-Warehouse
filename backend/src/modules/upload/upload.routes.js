const express = require("express");
const router = express.Router();
const { uploadFile, uploadBoqReference } = require("./upload.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post("/", uploadFile);

router.post(
  "/boq-reference",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  uploadBoqReference
);

module.exports = router;
