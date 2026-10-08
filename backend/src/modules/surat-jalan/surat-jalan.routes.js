const express = require("express");

const router = express.Router();

const suratJalanController = require("./surat-jalan.controller");
const {
  createSuratJalanSchema,
  receiveInboundSchema,
  rejectOutboundSchema,
  cancelDraftSchema,
  putawaySchema,
  retrieveSchema,
  deliveryStatusSchema,
  itemFotoSchema,
  tibaTransitSchema,
  lanjutDariTransitSchema
} = require("./surat-jalan.validation");
const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const { attachGudangScope } = require("../../middlewares/gudang-scope.middleware");

router.post("/", authenticate, authorize("ADMIN", "STAFF"), validate(createSuratJalanSchema), suratJalanController.create);
router.post(
  "/inbound/staff",
  authenticate,
  validate(createSuratJalanSchema),
  suratJalanController.createStaffInbound
);
router.post(
  "/:id/receive-inbound",
  authenticate,
  attachGudangScope,
  validate(receiveInboundSchema),
  suratJalanController.receiveInbound
);
router.get("/outbound/queue", authenticate, suratJalanController.findOutboundQueue);
router.get("/outbound/approval", authenticate, authorize("SUPERVISOR"), suratJalanController.findOutboundForApproval);
router.get("/outbound/delivery", authenticate, authorize("SUPERVISOR"), suratJalanController.findOutboundForDelivery);
router.get("/outbound/riwayat-approval", authenticate, authorize("SUPERVISOR"), suratJalanController.findOutboundApprovalHistory);
router.get(
  "/outbound/:id",
  authenticate,
  attachGudangScope,
  suratJalanController.findOutboundDetail
);

router.get("/inbound", authenticate, suratJalanController.findInboundList);
router.get("/staff/history", authenticate, suratJalanController.findStaffHistory);
router.get("/rejected", authenticate, authorize("SUPERVISOR"), suratJalanController.findRejectedList);
router.get(
  "/:id",
  authenticate,
  attachGudangScope,
  suratJalanController.findById
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
  "/:id/delivery-status",
  authenticate,
  authorize("STAFF", "SUPERVISOR"),
  attachGudangScope,
  validate(deliveryStatusSchema),
  suratJalanController.updateDeliveryStatus
);

// Gudang Transit — STAFF ONLY (keputusan bisnis #6: supervisor tidak
// ditambahi aksi transit). Scope gudang tetap dipasang di kedua route.
router.post(
  "/:id/transit/tiba",
  authenticate,
  authorize("STAFF"),
  attachGudangScope,
  validate(tibaTransitSchema),
  suratJalanController.tibaDiTransit
);

router.post(
  "/:id/transit/lanjut",
  authenticate,
  authorize("STAFF"),
  attachGudangScope,
  validate(lanjutDariTransitSchema),
  suratJalanController.lanjutDariTransit
);

router.put(
  "/:id/reject-outbound",
  authenticate,
  authorize("SUPERVISOR"),
  validate(rejectOutboundSchema),
  suratJalanController.rejectOutbound
);

router.put(
  "/:id/cancel-draft",
  authenticate,
  authorize("STAFF", "SUPERVISOR", "ADMIN"),
  validate(cancelDraftSchema),
  suratJalanController.cancelDraft
);

router.post(
  "/:id/putaway",
  authenticate,
  authorize("STAFF", "SUPERVISOR"),
  attachGudangScope,
  validate(putawaySchema),
  suratJalanController.putaway
);

router.post(
  "/:id/retrieve",
  authenticate,
  authorize("STAFF", "SUPERVISOR"),
  attachGudangScope,
  validate(retrieveSchema),
  suratJalanController.retrieve
);

router.post(
  "/:id/items/:itemId/fotos",
  authenticate,
  authorize("STAFF", "SUPERVISOR"),
  attachGudangScope,
  validate(itemFotoSchema),
  suratJalanController.addItemFoto
);

router.delete(
  "/:id/items/:itemId/fotos/:fotoId",
  authenticate,
  authorize("STAFF", "SUPERVISOR"),
  attachGudangScope,
  suratJalanController.deleteItemFoto
);

module.exports = router;
