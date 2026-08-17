const AppError = require("../shared/errors");

const ROLE_ALIASES = {
  admin_general: "ADMIN",
  supervisor: "SUPERVISOR",
  staf_gudang: "STAFF",
};

const normalizeRole = (role) => ROLE_ALIASES[role] || role;

const authorize = (...roles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new AppError(
                    "Unauthorized.",
                    401
                );
            }

            const userRole = normalizeRole(req.user.role);

            if (!roles.includes(userRole)) {
                throw new AppError(
                    "Anda tidak memiliki hak akses.",
                    403
                );
            }

            next();
        } catch (err) {
            next(err);
        }
    };
};

module.exports = authorize;
