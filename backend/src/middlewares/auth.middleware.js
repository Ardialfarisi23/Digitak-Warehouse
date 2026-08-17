const jwt = require("jsonwebtoken");
const AppError = require("../shared/errors");

const { JWT_SECRET } = require("../config/env");

const authenticate = (req, res, next) => {

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

        next();

    } catch (err) {

        if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
            err.statusCode = 401;
        }

        next(err);

    }

};

module.exports = authenticate;