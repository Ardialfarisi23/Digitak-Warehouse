const express = require("express");

const router = express.Router();

const authController = require("./auth.controller");

const { loginSchema, changePasswordSchema } = require("./auth.validation");

const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const validate = require("../../middlewares/validation.middleware");

router.post(
    "/login",
    validate(loginSchema),
    authController.login
);

router.put(
    "/change-password",
    authenticate,
    validate(changePasswordSchema),
    authController.changePassword
);

router.post(
    "/refresh",
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