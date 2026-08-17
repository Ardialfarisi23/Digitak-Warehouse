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
  authorize("ADMIN"),
  validate(updateProjectSchema),
  projectController.update
);

module.exports = router;
