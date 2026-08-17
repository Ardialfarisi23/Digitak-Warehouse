const express = require("express");

const router = express.Router();

const suratJalanController = require("./surat-jalan.controller");
const { createSuratJalanSchema, receiveInboundSchema, approveInboundSchema, rejectInboundSchema, rejectOutboundSchema, putawaySchema, retrieveSchema } = require("./surat-jalan.validation");
const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post("/", authenticate, validate(createSuratJalanSchema), suratJalanController.create);
router.post(
  "/inbound/staff",
  authenticate,
  validate(createSuratJalanSchema),
  suratJalanController.createStaffInbound
);
router.post(
  "/:id/receive-inbound",
  authenticate,
  validate(receiveInboundSchema),
  suratJalanController.receiveInbound
);
router.get("/outbound/queue", authenticate, suratJalanController.findOutboundQueue);
router.get("/outbound/approval", authenticate, suratJalanController.findOutboundForApproval);
router.get("/outbound/delivery", authenticate, suratJalanController.findOutboundForDelivery);
router.get("/inbound", authenticate, suratJalanController.findInboundList);
router.get("/verification/queue", authenticate, suratJalanController.findVerificationQueue);
router.get("/:id", authenticate, suratJalanController.findById);

router.put(
  "/:id/approve-inbound",
  authenticate,
  authorize("SUPERVISOR"),
  validate(approveInboundSchema),
  suratJalanController.approveInbound
);

router.post(
  "/:id/approve-inbound",
  authenticate,
  authorize("SUPERVISOR"),
  validate(approveInboundSchema),
  suratJalanController.approveInbound
);

router.put(
  "/:id/approve-outbound",
  authenticate,
  authorize("SUPERVISOR"),
  suratJalanController.approveOutbound
);

router.put(
  "/:id/confirm-distributed",
  authenticate,
  authorize("SUPERVISOR"),
  suratJalanController.confirmDistributed
);

router.put(
  "/:id/reject-inbound",
  authenticate,
  authorize("SUPERVISOR"),
  validate(rejectInboundSchema),
  suratJalanController.rejectInbound
);

router.put(
  "/:id/reject-outbound",
  authenticate,
  authorize("SUPERVISOR"),
  validate(rejectOutboundSchema),
  suratJalanController.rejectOutbound
);

router.post(
  "/:id/putaway",
  authenticate,
  authorize("STAFF", "SUPERVISOR"),
  validate(putawaySchema),
  suratJalanController.putaway
);

router.post(
  "/:id/retrieve",
  authenticate,
  authorize("STAFF", "SUPERVISOR"),
  validate(retrieveSchema),
  suratJalanController.retrieve
);

module.exports = router;
