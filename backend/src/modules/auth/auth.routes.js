const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");

const { loginSchema, changePasswordSchema, resetPasswordSchema } = require("./auth.validation");

const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const validate = require("../../middlewares/validation.middleware");
const { loginLimiter, passwordResetLimiter, refreshLimiter } = require("../../middlewares/rate-limit");

router.post(
  "/login",
  validate(loginSchema),
  loginLimiter,
  authController.login
);

router.post(
  "/forgot-password",
  passwordResetLimiter,
  authController.forgotPassword
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

router.post(
  "/refresh",
  refreshLimiter,
  authController.refresh
);

router.post(
  "/logout",
  authenticate,
  authController.logout
);

router.get(
  "/me",
  authenticate,
  authController.me
);

router.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  (req, res) => {
    return res.json({
      success: true,
      message: "Selamat datang Admin.",
      user: req.user
    });
  }
);

module.exports = router;