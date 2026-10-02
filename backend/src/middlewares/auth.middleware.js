const jwt = require("jsonwebtoken");
const AppError = require("../shared/errors");

const { JWT_SECRET } = require("../config/env");
const prisma = require("../config/prisma");
const requirePasswordChange = require("./require-password-change.middleware");

const authenticate = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {

            throw new AppError(
                "Token tidak ditemukan.",
                401
            );

        }

        if (!authHeader.startsWith("Bearer ")) {

            throw new AppError(
                "Format token tidak valid.",
                401
            );

        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        req.user = decoded;

        const user = await prisma.user_account.findFirst({
            where: { user_id: BigInt(req.user.id) },
            select: { is_aktif: true },
        });

        if (!user || user.is_aktif === false) {
            return res.status(401).json({
                code: "ACCOUNT_DEACTIVATED",
                message: "Akun Anda telah dinonaktifkan",
            });
        }

        requirePasswordChange(req, res, next);

    } catch (err) {

        if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
            err.statusCode = 401;
        }

        next(err);

    }

};

module.exports = authenticate;