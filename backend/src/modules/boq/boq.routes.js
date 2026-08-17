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

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "SUPERVISOR"),
  validate(createBoqSchema),
  boqController.create
);

router.get("/", authenticate, boqController.findAll);
router.get("/stats", authenticate, boqController.getStats);
router.get("/areas", authenticate, boqController.getAreas);
router.get("/items", authenticate, boqController.getItems);
router.get("/export", authenticate, boqController.exportBoqs);
router.get("/:id", authenticate, boqController.findById);
router.get("/:id/summary", authenticate, boqController.getSummary);

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
