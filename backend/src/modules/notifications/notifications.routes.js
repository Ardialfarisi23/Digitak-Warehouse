const express = require("express");

const router = express.Router();

const notificationController = require("./notifications.controller");

const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validation.middleware");
const { listNotificationsSchema, markReadSchema, markAllReadSchema } = require("./notifications.validation");

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SUPERVISOR", "STAFF"),
  validate(listNotificationsSchema, "query"),
  notificationController.list
);

router.get(
  "/unread-count",
  authenticate,
  authorize("ADMIN", "SUPERVISOR", "STAFF"),
  notificationController.unreadCount
);

router.patch(
  "/:id/read",
  authenticate,
  authorize("ADMIN", "SUPERVISOR", "STAFF"),
  validate(markReadSchema, "params"),
  notificationController.markRead
);

router.patch(
  "/read-all",
  authenticate,
  authorize("ADMIN", "SUPERVISOR", "STAFF"),
  validate(markAllReadSchema, "body"),
  notificationController.markAllRead
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPERVISOR", "STAFF"),
  notificationController.deleteOne
);

router.delete(
  "/",
  authenticate,
  authorize("ADMIN", "SUPERVISOR", "STAFF"),
  notificationController.deleteMany
);

module.exports = router;
