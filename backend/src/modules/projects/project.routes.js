const express = require("express");
const router = express.Router();

const projectController = require("./project.controller");

const {
  createProjectSchema,
  updateProjectSchema,
} = require("./project.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const { deleteLimiter } = require("../../middlewares/rate-limit");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createProjectSchema),
  projectController.create
);

router.get("/", authenticate, projectController.findAll);
router.get("/:project_id", authenticate, projectController.findByProjectId);
router.put(
  "/:project_id",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(updateProjectSchema),
  projectController.update
);

router.delete(
  "/:project_id",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  deleteLimiter,
  projectController.remove
);

router.patch(
  "/:project_id/nonaktifkan",
  authenticate,
  authorize("ADMIN"),
  projectController.nonaktifkan
);

router.patch(
  "/:project_id/restore",
  authenticate,
  authorize("ADMIN"),
  projectController.restore
);

module.exports = router;