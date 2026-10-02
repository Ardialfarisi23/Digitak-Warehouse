const express = require("express");

const router = express.Router();

const clusterController = require("./cluster.controller");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const { createClusterSchema, updateClusterSchema } = require("./cluster.validation");

router.get("/", authenticate, clusterController.listByProject);
router.get("/all", authenticate, clusterController.listAll);
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(createClusterSchema),
  clusterController.create
);
router.put(
  "/:clusterId",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(updateClusterSchema),
  clusterController.update
);
router.patch("/:clusterId/toggle-status", authenticate, authorize("ADMIN", "SUPERVISOR"), clusterController.toggleStatus);
router.delete("/:clusterId", authenticate, authorize("ADMIN", "SUPERVISOR"), clusterController.deleteCluster);

module.exports = router;
