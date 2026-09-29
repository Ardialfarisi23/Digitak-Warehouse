class AppError extends Error {

    constructor(message, statusCode, code = null) {

        super(message);

        this.statusCode = statusCode;
        this.code = code;

        this.status =
            `${statusCode}`.startsWith("4")
                ? "fail"
                : "error";

        Error.captureStackTrace(
            this,
            this.constructor
        );

    }

}

module.exports = AppError;