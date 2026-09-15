const router = require("express").Router();

const settingsController = require("./settings.controller");

const authenticate = require("../../middlewares/auth.middleware");

const validate = require("../../middlewares/validation.middleware");

const { updateNotificationPreferencesSchema, updateUserSettingsSchema } = require("./settings.validation");

router.get("/notifications", authenticate, settingsController.getNotificationPreferences);

router.put("/notifications", authenticate, validate(updateNotificationPreferencesSchema), settingsController.updateNotificationPreferences);

router.get("/", authenticate, settingsController.getUserSettings);

router.put("/", authenticate, validate(updateUserSettingsSchema), settingsController.updateUserSettings);

module.exports = router;
