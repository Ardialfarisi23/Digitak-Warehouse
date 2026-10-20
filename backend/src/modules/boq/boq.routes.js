const express = require("express");
const router = express.Router();

const boqController = require("./boq.controller");

const {
  createBoqSchema,
  updateBoqSchema,
  updateBoqStatusSchema,
} = require("./boq.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const { deleteLimiter } = require("../../middlewares/rate-limit");

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(createBoqSchema),
  boqController.create
);

// Endpoint di bawah dipakai form Surat Jalan (staf) untuk memilih BOQ -> tetap terbuka untuk semua role:
//   GET /            (BoqPicker.tsx, staff/inbound/new, staff/outbound/new)
//   GET /items       (staff/outbound/new - item BOQ)
//   GET /:id         (staff/inbound/new - detail BOQ)
// Endpoint baca khusus management Cluster & BOQ -> Admin & Supervisor saja.
router.get("/", authenticate, boqController.findAll);
router.get("/stats", authenticate, authorize("ADMIN", "SUPERVISOR"), boqController.getStats);
router.get("/areas", authenticate, authorize("ADMIN", "SUPERVISOR"), boqController.getAreas);
router.get("/items", authenticate, boqController.getItems);
router.get("/check-ticket", authenticate, authorize("ADMIN", "SUPERVISOR"), boqController.checkTicketAvailability);
router.get("/export", authenticate, authorize("ADMIN", "SUPERVISOR"), boqController.exportBoqs);
router.get("/export-matrix", authenticate, authorize("ADMIN", "SUPERVISOR"), boqController.exportMatrixExcel);
router.get("/:id", authenticate, boqController.findById);
router.get("/:id/summary", authenticate, authorize("ADMIN", "SUPERVISOR"), boqController.getSummary);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(updateBoqSchema),
  boqController.update
);

router.put(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(updateBoqStatusSchema),
  boqController.updateStatus
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(updateBoqStatusSchema),
  boqController.updateStatus
);

router.put(
  "/:id/verification",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  boqController.update
);

router.patch(
  "/:id/verification",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  boqController.update
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteLimiter,
  boqController.softDelete
);

router.put(
  "/:id/restore",
  authenticate,
  authorize("ADMIN"),
  boqController.restore
);

router.patch(
  "/:id/restore",
  authenticate,
  authorize("ADMIN"),
  boqController.restore
);

module.exports = router;