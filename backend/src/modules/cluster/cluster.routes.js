const express = require("express");

const router = express.Router();

const clusterController = require("./cluster.controller");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const { createClusterSchema, updateClusterSchema } = require("./cluster.validation");

// Endpoint manajemen Cluster — hanya Admin & Supervisor (staf → 403 Forbidden).
router.get("/", authenticate, authorize("ADMIN", "SUPERVISOR"), clusterController.listByProject);
router.get("/all", authenticate, authorize("ADMIN", "SUPERVISOR"), clusterController.listAll);

// Endpoint READ-ONLY khusus staf: hanya id/kode/nama cluster untuk dropdown
// pada form Surat Jalan. Tidak ada aksi tambah/ubah/hapus di sini.
router.get("/options", authenticate, clusterController.listOptions);

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
